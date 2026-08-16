<template>
  <div class="equation-widget" :style="widgetStyle">
    <div class="equation-toggle-row">
      <button class="drag-handle" @mousedown="startDrag">↕</button>

      <button class="equation-toggle" @click="open = !open">
        {{ open ? "Hide Equations" : "Show Equations" }}
      </button>
    </div>

    <div v-if="open" class="equation-panel">
      <div class="equation-header">
        <strong>Shear & Moment Equations</strong>

        <div>
          <button @click="refresh">Refresh</button>
          <button @click="open = false">×</button>
        </div>
      </div>

      <div class="equation-body">
        <div v-if="equations.length === 0" class="empty">
          Solve a beam model to show equations.
        </div>

        <div v-for="eq in equations" :key="eq.element" class="equation-card">
          <div class="element-title">
            Element {{ eq.element }}: 0 ≤ x ≤ {{ eq.length }} {{ units.length }}
          </div>

          <div class="eq">
            V(x) [{{ units.force }}] = {{ eq.shear }}
          </div>

          <div class="eq">
            M(x) [{{ units.moment }}] = {{ eq.moment }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useProjectStore } from "@/store/project";
import { useAppStore } from "@/store/app";
import {
  BeamConcentratedLoad,
  BeamElementUniformEdgeLoad,
  BeamElementTrapezoidalEdgeLoad,
} from "ts-fem";

const project = useProjectStore();
const appStore = useAppStore();

const refreshKey = ref(0);
const open = ref(false);

const x = ref(window.innerWidth - 180);
const y = ref(90);

let dragging = false;
let offsetX = 0;
let offsetY = 0;

const widgetStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}));

const units = computed(() => ({
  length: appStore.units.Length,
  force: appStore.units.Force,
  moment: `${appStore.momentUnits.force}${appStore.momentUnits.length}`,
}));

function startDrag(event: MouseEvent) {
  dragging = true;
  offsetX = event.clientX - x.value;
  offsetY = event.clientY - y.value;

  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);
}

function onDrag(event: MouseEvent) {
  if (!dragging) return;

  x.value = event.clientX - offsetX;
  y.value = event.clientY - offsetY;
}

function stopDrag() {
  dragging = false;

  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
}

function refresh() {
  project.solve();
  refreshKey.value++;
}

function clean(v: number) {
  if (Math.abs(v) < 1e-9) return 0;
  return Number(v.toPrecision(5));
}

function num(v: number) {
  return String(clean(v));
}

function addTerm(terms: string[], coefficient: number, expression: string) {
  coefficient = clean(coefficient);

  if (coefficient === 0) return;

  const sign = coefficient > 0 ? "+" : "-";
  const mag = Math.abs(coefficient);

  if (terms.length === 0) {
    terms.push(`${coefficient < 0 ? "-" : ""}${num(mag)}${expression}`);
  } else {
    terms.push(`${sign} ${num(mag)}${expression}`);
  }
}

function buildEquation(terms: string[]) {
  if (terms.length === 0) return "0";
  return terms.join(" ");
}

function forceCoefficient(value: number, lengthPower: number) {
  const meterPerDisplayLength = appStore.convertInverseLength(1);
  return appStore.convertForce(value * meterPerDisplayLength ** lengthPower);
}

function momentCoefficient(value: number, lengthPower: number) {
  const meterPerDisplayLength = appStore.convertInverseLength(1);
  return appStore.convertMoment(value * meterPerDisplayLength ** lengthPower);
}

const equations = computed(() => {
  refreshKey.value;

  // Make this reactive to unit changes
  appStore.units.Length;
  appStore.units.Force;
  appStore.momentUnits.force;
  appStore.momentUnits.length;

  const loadCase = project.solver.loadCases[0];

  if (!loadCase?.solved) return [];

  return project.beams.map((beam: any) => {
    const geo = beam.computeGeo();

    const Ldisplay = clean(appStore.convertLength(geo.l));

    const F = beam.computeEndForces(loadCase);

    const V0 = -F.get([1]);
    const M0 = -F.get([2]);

    const shearTerms: string[] = [];
    const momentTerms: string[] = [];

    addTerm(shearTerms, forceCoefficient(V0, 0), "");
    addTerm(momentTerms, momentCoefficient(M0, 0), "");
    addTerm(momentTerms, momentCoefficient(V0, 1), "x");

    const elementLoads = loadCase.getElementLoadsOnElement(beam.label);

    for (const load of elementLoads) {
      if (load instanceof BeamElementUniformEdgeLoad) {
        const qz = load.getLocalIntensities().fz;

        addTerm(shearTerms, forceCoefficient(-qz, 1), "x");
        addTerm(momentTerms, momentCoefficient(-qz / 2, 2), "x²");
      }

      else if (load instanceof BeamElementTrapezoidalEdgeLoad) {
        const intensities = load.getLocalIntensities();

        const q0 = intensities.start.fz;
        const q1 = intensities.end.fz;
        const dq = q1 - q0;

        addTerm(shearTerms, forceCoefficient(-q0, 1), "x");
        addTerm(shearTerms, forceCoefficient(-dq / (2 * geo.l), 2), "x²");

        addTerm(momentTerms, momentCoefficient(-q0 / 2, 2), "x²");
        addTerm(momentTerms, momentCoefficient(-dq / (6 * geo.l), 3), "x³");
      }

      else if (load instanceof BeamConcentratedLoad) {
        const f = load.getLocalIntensities();

        const Pz = f.fz;
        const My = f.my;

        const aInternal = load.values[3];
        const aDisplay = clean(appStore.convertLength(aInternal));

        addTerm(shearTerms, forceCoefficient(-Pz, 0), `H(x-${aDisplay})`);
        addTerm(momentTerms, momentCoefficient(-Pz, 1), `(x-${aDisplay})H(x-${aDisplay})`);
        addTerm(momentTerms, momentCoefficient(-My, 0), `H(x-${aDisplay})`);
      }
    }

    return {
      element: beam.label,
      length: Ldisplay,
      shear: buildEquation(shearTerms),
      moment: buildEquation(momentTerms),
    };
  });
});
</script>

<style scoped>
.equation-widget {
  position: fixed;
  z-index: 9999;
  font-family: Arial, sans-serif;
}

.equation-toggle-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.drag-handle {
  padding: 8px 10px;
  background: #374151;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: move;
  user-select: none;
}

.equation-toggle {
  padding: 8px 12px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.equation-panel {
  margin-top: 8px;
  width: 460px;
  max-height: 55vh;
  background: white;
  color: black;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.equation-header {
  padding: 10px 12px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equation-header button {
  margin-left: 6px;
  cursor: pointer;
  padding: 4px 8px;
}

.equation-body {
  overflow-y: auto;
  padding: 12px;
}

.equation-card {
  border-top: 1px solid #ddd;
  padding-top: 8px;
  margin-top: 8px;
}

.element-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.eq {
  font-family: Consolas, monospace;
  background: #f5f5f5;
  padding: 6px;
  margin: 5px 0;
  border-radius: 4px;
  overflow-x: auto;
  white-space: nowrap;
}

.empty {
  color: #666;
  font-style: italic;
}
</style>