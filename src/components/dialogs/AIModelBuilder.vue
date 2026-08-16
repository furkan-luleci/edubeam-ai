<template>
  <v-dialog v-model="open" max-width="900">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-creation</v-icon>
        AI Model Builder
      </v-card-title>

      <v-card-text>
        <v-alert
          type="info"
          variant="tonal"
          class="mb-4"
        >
          Upload, drag-and-drop, or paste a structural diagram. Gemini will
          interpret the geometry, supports and loads, then EduBeam will
          build the model.
        </v-alert>

        <v-alert
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Building the AI model will replace the current nodes, elements and
          loads. Existing material and cross-section properties will be reused.
        </v-alert>


        <v-select
          v-model="selectedModel"
          :items="modelOptions"
          item-title="title"
          item-value="value"
          label="Gemini model"
          variant="outlined"
          class="mb-2"
          :disabled="loading"
        >
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :subtitle="item.raw.description"
            />
          </template>
        </v-select>

        <div class="text-caption mb-4">
          Use Gemini 3.7 Flash for difficult structures.
          Flash-Lite is useful for simpler diagrams or when
          conserving your available quota.
        </div>

        <div
          class="paste-zone mb-4"
          tabindex="0"
          @paste="handlePaste"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <v-icon size="42" class="mb-2">
            mdi-image-plus
          </v-icon>

          <div class="text-h6 mb-1">
            Upload or paste structural diagram
          </div>

          <div class="text-body-2 mb-3">
            Click anywhere in this window and press
            <strong>Ctrl + V</strong> to paste a copied image.
          </div>

          <div class="text-body-2 mb-4">
            You can also drag and drop a PNG, JPG, or WEBP image here.
          </div>

          <v-file-input
            v-model="selectedFile"
            label="Choose image"
            accept="image/png,image/jpeg,image/webp"
            prepend-icon="mdi-image"
            variant="outlined"
            clearable
            :disabled="loading"
            hide-details
          />

          <v-alert
            v-if="chosenFile"
            type="success"
            variant="tonal"
            density="compact"
            class="mt-3 text-left"
          >
            Image ready:
            <strong>{{ chosenFile.name }}</strong>
          </v-alert>
        </div>

        <v-textarea
          v-model="instruction"
          label="Optional instruction"
          placeholder="Example: The circle at E is an internal hinge."
          variant="outlined"
          rows="2"
          auto-grow
          :disabled="loading"
        />

        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ errorMessage }}
        </v-alert>

        <v-progress-linear
          v-if="loading"
          indeterminate
          class="mb-4"
        />

        <div v-if="loading" class="text-center mb-4">
          Gemini is reading the structural diagram...
        </div>

        <template v-if="result">
          <v-divider class="my-4" />

          <h3 class="mb-2">Gemini interpretation</h3>

          <p class="mb-3">
            {{ result.summary }}
          </p>

          <v-chip class="mr-2 mb-2">
            {{ result.nodes.length }} nodes
          </v-chip>

          <v-chip class="mr-2 mb-2">
            {{ result.members.length }} members
          </v-chip>

          <v-chip class="mr-2 mb-2">
            {{
              result.nodal_loads.length +
              result.distributed_loads.length +
              result.member_point_loads.length
            }}
            loads
          </v-chip>

          <v-alert
            v-if="result.uncertainties.length > 0"
            type="warning"
            variant="tonal"
            class="my-4"
          >
            <strong>Please check these uncertainties:</strong>
            <ul class="ml-5 mt-2">
              <li
                v-for="(item, index) in result.uncertainties"
                :key="index"
              >
                {{ item }}
              </li>
            </ul>
          </v-alert>

          <v-expansion-panels class="mt-4">
            <v-expansion-panel title="Show AI JSON">
              <v-expansion-panel-text>
                <pre class="json-preview">{{ resultText }}</pre>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          variant="text"
          :disabled="loading"
          @click="closeModal"
        >
          Cancel
        </v-btn>

        <v-btn
          color="secondary"
          variant="flat"
          :loading="loading"
          :disabled="!chosenFile || loading"
          @click="analyzeImage"
        >
          <v-icon class="mr-1">mdi-eye</v-icon>
          Analyze Image
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :disabled="!result || loading"
          @click="buildModel"
        >
          <v-icon class="mr-1">mdi-hammer-wrench</v-icon>
          Build in EduBeam
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { closeModal } from 'jenesius-vue-modal';
import { DofID } from 'ts-fem';

import { useProjectStore } from '@/store/project';
import { useAppStore } from '@/store/app';
import { executeModelMutationWithUndo } from '@/utils';
import { eventBus, EventType } from '@/EventBus';
import {
  engineeringZToEduBeam,
  engineeringFzToEduBeam
} from '@/utils/engineeringCoordinates';

const open = ref(true);

const selectedFile = ref<File | File[] | null>(null);
const instruction = ref('');

const selectedModel = ref(
  'gemini-3.7-flash'
);

const modelOptions = [
  {
    title: 'Gemini 3.7 Flash',
    value: 'gemini-3.7-flash',
    description:
      'Recommended — best choice for complex structural diagrams'
  },
  {
    title: 'Gemini 3.6 Flash',
    value: 'gemini-3.6-flash',
    description:
      'Strong alternative when 3.7 quota is unavailable'
  },
  {
    title: 'Gemini 3.5 Flash',
    value: 'gemini-3.5-flash',
    description:
      'Older strong multimodal Flash model'
  },
  {
    title: 'Gemini 3.5 Flash-Lite',
    value: 'gemini-3.5-flash-lite',
    description:
      'Fastest/lightest — best for simple diagrams and conserving quota'
  }
];

const loading = ref(false);
const errorMessage = ref('');
const result = ref<any>(null);

const chosenFile = computed<File | null>(() => {
  if (!selectedFile.value) return null;

  if (Array.isArray(selectedFile.value)) {
    return selectedFile.value[0] ?? null;
  }

  return selectedFile.value;
});

const resultText = computed(() => {
  return result.value
    ? JSON.stringify(result.value, null, 2)
    : '';
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result ?? '');
      const commaIndex = value.indexOf(',');

      if (commaIndex < 0) {
        reject(new Error('Could not convert the image.'));
        return;
      }

      resolve(value.substring(commaIndex + 1));
    };

    reader.onerror = () => {
      reject(new Error('Could not read the image.'));
    };

    reader.readAsDataURL(file);
  });
}


function imageExtension(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';

    case 'image/webp':
      return 'webp';

    case 'image/png':
    default:
      return 'png';
  }
}

function acceptImageFile(file: File) {
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    errorMessage.value =
      'Please paste or upload a PNG, JPG/JPEG, or WEBP image.';
    return false;
  }

  if (file.size > 8 * 1024 * 1024) {
    errorMessage.value =
      'For this prototype, please use an image smaller than 8 MB.';
    return false;
  }

  selectedFile.value = file;
  errorMessage.value = '';
  result.value = null;

  return true;
}

function handlePaste(event: ClipboardEvent) {
  if (!open.value || loading.value) {
    return;
  }

  const clipboardData = event.clipboardData;

  if (!clipboardData) {
    return;
  }

  const imageItem = Array.from(
    clipboardData.items
  ).find((item) =>
    item.type.startsWith('image/')
  );

  if (!imageItem) {
    return;
  }

  const blob = imageItem.getAsFile();

  if (!blob) {
    errorMessage.value =
      'The clipboard contained an image, but it could not be read.';
    return;
  }

  const extension = imageExtension(blob.type);

  const file = new File(
    [blob],
    `pasted-structure-${Date.now()}.${extension}`,
    {
      type: blob.type
    }
  );

  if (acceptImageFile(file)) {
    event.preventDefault();
  }
}

function handleDrop(event: DragEvent) {
  if (loading.value) {
    return;
  }

  const file =
    event.dataTransfer?.files?.[0];

  if (!file) {
    return;
  }

  acceptImageFile(file);
}

onMounted(() => {
  window.addEventListener(
    'paste',
    handlePaste
  );
});

onBeforeUnmount(() => {
  window.removeEventListener(
    'paste',
    handlePaste
  );
});

async function analyzeImage() {
  errorMessage.value = '';
  result.value = null;

  const file = chosenFile.value;

  if (!file) {
    errorMessage.value = 'Please select an image first.';
    return;
  }

  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    errorMessage.value =
      'Please use a PNG, JPG/JPEG, or WEBP image.';
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    errorMessage.value =
      'For this prototype, please use an image smaller than 8 MB.';
    return;
  }

  loading.value = true;

  try {
    const imageBase64 = await fileToBase64(file);

    const response = await fetch(
      'http://localhost:3001/api/structural-model',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: file.type,
          instruction: instruction.value,
          model: selectedModel.value
        })
      }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        body.error ||
        `AI server returned HTTP ${response.status}.`
      );
    }

    validateStructuralModel(body);

    result.value = body;
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Unknown error while analyzing the image.';
  } finally {
    loading.value = false;
  }
}

function validateStructuralModel(model: any) {
  if (!model || !Array.isArray(model.nodes)) {
    throw new Error('AI response does not contain nodes.');
  }

  if (!Array.isArray(model.members)) {
    throw new Error('AI response does not contain members.');
  }

  if (model.nodes.length === 0) {
    throw new Error('AI did not detect any structural nodes.');
  }

  if (model.members.length === 0) {
    throw new Error('AI did not detect any structural members.');
  }

  const nodeIds = new Set<string>();

  for (const node of model.nodes) {
    const id = String(node.id);

    if (nodeIds.has(id)) {
      throw new Error(`Duplicate node ID: ${id}`);
    }

    nodeIds.add(id);

    if (
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.z)
    ) {
      throw new Error(
        `Node ${id} has invalid coordinates.`
      );
    }
  }

  const memberIds = new Set<string>();

  for (const member of model.members) {
    const id = String(member.id);

    if (memberIds.has(id)) {
      throw new Error(`Duplicate member ID: ${id}`);
    }

    memberIds.add(id);

    if (!nodeIds.has(String(member.start_node))) {
      throw new Error(
        `Member ${id} references missing start node ${member.start_node}.`
      );
    }

    if (!nodeIds.has(String(member.end_node))) {
      throw new Error(
        `Member ${id} references missing end node ${member.end_node}.`
      );
    }

    if (
      String(member.start_node) ===
      String(member.end_node)
    ) {
      throw new Error(
        `Member ${id} has the same start and end node.`
      );
    }
  }

  for (const load of model.nodal_loads ?? []) {
    if (!nodeIds.has(String(load.node_id))) {
      throw new Error(
        `Nodal load references missing node ${load.node_id}.`
      );
    }
  }

  for (const load of model.distributed_loads ?? []) {
    if (!memberIds.has(String(load.member_id))) {
      throw new Error(
        `Distributed load references missing member ${load.member_id}.`
      );
    }
  }

  for (const load of model.member_point_loads ?? []) {
    if (!memberIds.has(String(load.member_id))) {
      throw new Error(
        `Member point load references missing member ${load.member_id}.`
      );
    }
  }

  for (const load of model.temperature_loads ?? []) {
    if (!memberIds.has(String(load.member_id))) {
      throw new Error(
        `Temperature load references missing member ${load.member_id}.`
      );
    }
  }
}


function normalizeUnit(unit: string) {
  return String(unit || '')
    .trim()
    .replace(/·/g, '*')
    .replace(/⋅/g, '*')
    .replace(/[×x]/g, '*')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
}

function toMeters(
  value: number,
  unit: string
) {
  const u = normalizeUnit(unit);

  const factors: Record<string, number> = {
    m: 1,
    meter: 1,
    meters: 1,

    cm: 0.01,
    mm: 0.001,

    ft: 0.3048,
    foot: 0.3048,
    feet: 0.3048,

    in: 0.0254,
    inch: 0.0254,
    inches: 0.0254,

    yd: 0.9144
  };

  const factor = factors[u];

  if (factor === undefined) {
    throw new Error(
      `Unsupported source length unit: ${unit}`
    );
  }

  return value * factor;
}

function toNewtons(
  value: number,
  unit: string
) {
  const u = normalizeUnit(unit);

  const factors: Record<string, number> = {
    n: 1,

    // Gemini sometimes reads "kN" as just "k".
    // Because this function is specifically parsing FORCE units,
    // interpret bare "k" as kN.
    k: 1000,
    kn: 1000,
    kilonewton: 1000,
    kilonewtons: 1000,

    mn: 1000000,
    meganewton: 1000000,
    meganewtons: 1000000,

    lbf: 4.4482216152605,
    lb: 4.4482216152605,

    kip: 4448.2216152605,
    k: 4448.2216152605,
    klb: 4448.2216152605,
    kips: 4448.2216152605,

    kgf: 9.80665,

    tonf: 9806.65,
    tf: 9806.65
  };

  const factor = factors[u];

  if (factor === undefined) {
    throw new Error(
      `Unsupported source force unit: ${unit}`
    );
  }

  return value * factor;
}

function toNewtonMeters(
  value: number,
  unit: string
) {
  let u = normalizeUnit(unit);

  /*
   * Common compact notations.
   */
  const aliases: Record<string, string> = {
    nm: 'n*m',
    'n-m': 'n*m',

    knm: 'kn*m',
    'kn-m': 'kn*m',

    mnm: 'mn*m',
    'mn-m': 'mn*m',

    nmm: 'n*mm',
    'n-mm': 'n*mm',

    knmm: 'kn*mm',
    'kn-mm': 'kn*mm',

    'kip-ft': 'kip*ft',
    'kip-in': 'kip*in',

    'lbf-ft': 'lbf*ft',
    'lbf-in': 'lbf*in'
  };

  u = aliases[u] ?? u;

  const parts = u.split('*');

  if (parts.length !== 2) {
    throw new Error(
      `Unsupported source moment unit: ${unit}`
    );
  }

  return (
    toNewtons(value, parts[0]) *
    toMeters(1, parts[1])
  );
}

function toNewtonsPerMeter(
  value: number,
  unit: string
) {
  const u = normalizeUnit(unit);

  const parts = u.split('/');

  if (parts.length !== 2) {
    throw new Error(
      `Unsupported distributed-load unit: ${unit}`
    );
  }

  return (
    toNewtons(value, parts[0]) /
    toMeters(1, parts[1])
  );
}


function sourceMomentParts(
  momentUnit: string,
  fallbackForce: string,
  fallbackLength: string
) {
  const u = normalizeUnit(momentUnit)
    .replace(/-/g, '*');

  let force = fallbackForce;
  let length = fallbackLength;

  if (
    u.includes('kip') ||
    u.startsWith('k*')
  ) {
    force = 'kip';
  } else if (u.includes('lbf')) {
    force = 'lbf';
  } else if (u.includes('kn')) {
    force = 'kN';
  } else if (u.includes('mn')) {
    force = 'MN';
  } else if (u.startsWith('n')) {
    force = 'N';
  } else if (u.includes('tonf')) {
    force = 'Tonf';
  }

  if (u.includes('ft')) {
    length = 'ft';
  } else if (u.includes('in')) {
    length = 'in';
  } else if (u.includes('mm')) {
    length = 'mm';
  } else if (u.includes('cm')) {
    length = 'cm';
  } else if (u.includes('m')) {
    length = 'm';
  }

  return {
    force,
    length
  };
}


function applyAIUnitsToEduBeam(
  appStore: any,
  units: any
) {
  if (!units) {
    return;
  }

  const supportedLengths = [
    'm',
    'cm',
    'mm',
    'ft',
    'in'
  ];

  const supportedForces = [
    'N',
    'kN',
    'MN',
    'lbf',
    'kip',
    'kgf',
    'Tonf'
  ];

  const length =
    supportedLengths.includes(
      String(units.length)
    )
      ? String(units.length)
      : appStore.units.Length;

  const force =
    supportedForces.includes(
      String(units.force)
    )
      ? String(units.force)
      : appStore.units.Force;


  /*
   * Main geometry/load display units.
   */
  appStore.units.Length = length;
  appStore.units.Force = force;


  /*
   * Moment can use its own force/length
   * combination in EduBeam.
   */
  const momentParts =
    sourceMomentParts(
      String(units.moment ?? ''),
      force,
      length
    );

  appStore.momentUnits.force =
    momentParts.force;

  appStore.momentUnits.length =
    momentParts.length;


  /*
   * Switch other clearly system-specific
   * display units where useful.
   *
   * We intentionally DO NOT change Area or I
   * automatically because structural drawings
   * often use ft for spans but in²/in⁴ for
   * cross-section properties.
   */
  const imperial =
    ['ft', 'in'].includes(length) ||
    ['lbf', 'kip'].includes(force);

  if (imperial) {
    appStore.units.Mass = 'lb';

    if (force === 'kip') {
      appStore.units.Pressure = 'ksi';
    } else {
      appStore.units.Pressure = 'psi';
    }
  } else {
    appStore.units.Mass = 'kg';
    appStore.units.Pressure = 'MPa';
  }

  console.log(
    '[AI] EduBeam display units changed:',
    {
      Length: appStore.units.Length,
      Force: appStore.units.Force,
      Moment:
        `${appStore.momentUnits.force}*${appStore.momentUnits.length}`,
      Distributed:
        `${appStore.units.Force}/${appStore.units.Length}`,
      Pressure: appStore.units.Pressure
    }
  );
}


function normalizePropertyUnit(
  unit: string
) {
  return String(unit || '')
    .trim()
    .replace(/·/g, '*')
    .replace(/⋅/g, '*')
    .replace(/\^/g, '')
    .replace(/²/g, '2')
    .replace(/⁴/g, '4')
    .replace(/\s+/g, '')
    .toLowerCase();
}


function modulusToPa(
  value: number,
  unit: string
) {
  const u = normalizePropertyUnit(unit);

  const factors: Record<string, number> = {
    pa: 1,
    kpa: 1e3,
    mpa: 1e6,
    gpa: 1e9,

    psi: 6894.757293168,
    ksi: 6894757.293168,

    psf: 47.88025898033584,
    ksf: 47880.25898033584,

    'n/mm2': 1e6,
    'kn/m2': 1e3,

    'kip/in2': 6894757.293168,
    'k/in2': 6894757.293168,

    'kip/ft2': 47880.25898033584,
    'k/ft2': 47880.25898033584
  };

  const factor = factors[u];

  if (factor === undefined) {
    throw new Error(
      'Unsupported modulus unit: ' + unit
    );
  }

  return value * factor;
}


function areaToM2(
  value: number,
  unit: string
) {
  const u = normalizePropertyUnit(unit);

  const factors: Record<string, number> = {
    m2: 1,
    cm2: 1e-4,
    mm2: 1e-6,

    in2: 0.00064516,
    ft2: 0.09290304
  };

  const factor = factors[u];

  if (factor === undefined) {
    throw new Error(
      'Unsupported area unit: ' + unit
    );
  }

  return value * factor;
}


function inertiaToM4(
  value: number,
  unit: string
) {
  const u = normalizePropertyUnit(unit);

  const factors: Record<string, number> = {
    m4: 1,
    cm4: 1e-8,
    mm4: 1e-12,

    in4: 4.162314256e-7,
    ft4: 0.0086309748412416
  };

  const factor = factors[u];

  if (factor === undefined) {
    throw new Error(
      'Unsupported moment-of-inertia unit: ' + unit
    );
  }

  return value * factor;
}


function propertyKey(
  values: number[]
) {
  return values
    .map((value) =>
      Number(value).toExponential(12)
    )
    .join('|');
}


function applyMemberPropertyDisplayUnits(
  appStore: any,
  members: any[]
) {
  const eMember =
    members.find(
      (member) =>
        member.has_E &&
        member.E_unit
    );

  if (eMember) {
    const pressureUnit =
      String(eMember.E_unit);

    const allowedPressure = [
      'Pa',
      'kPa',
      'MPa',
      'GPa',
      'psi',
      'ksi'
    ];

    if (
      allowedPressure.includes(
        pressureUnit
      )
    ) {
      appStore.units.Pressure =
        pressureUnit;
    }
  }


  const aMember =
    members.find(
      (member) =>
        member.has_A &&
        member.A_unit
    );

  if (aMember) {
    const areaUnit =
      normalizePropertyUnit(
        aMember.A_unit
      );

    if (
      [
        'm2',
        'cm2',
        'mm2',
        'in2',
        'ft2'
      ].includes(areaUnit)
    ) {
      appStore.units.Area =
        areaUnit;
    }
  }


  const iMember =
    members.find(
      (member) =>
        member.has_I &&
        member.I_unit
    );

  if (iMember) {
    const inertiaUnit =
      normalizePropertyUnit(
        iMember.I_unit
      );

    if (
      [
        'm4',
        'cm4',
        'mm4',
        'in4',
        'ft4'
      ].includes(inertiaUnit)
    ) {
      appStore.units.AreaM2 =
        inertiaUnit;
    }
  }
}


function normalizeTemperatureUnit(
  unit: string
) {
  const u = String(unit || '')
    .trim()
    .replace(/°/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  if (
    [
      'f',
      'fahrenheit',
      'degf'
    ].includes(u)
  ) {
    return 'F';
  }

  return 'C';
}


/**
 * Convert a TEMPERATURE DIFFERENCE to internal Δ°C.
 *
 * This is intentionally NOT an absolute-temperature conversion.
 *
 * Δ°F -> Δ°C = × 5/9
 */
function temperatureDifferenceToC(
  value: number,
  unit: string
) {
  const u =
    normalizeTemperatureUnit(unit);

  if (u === 'F') {
    return value * 5 / 9;
  }

  return value;
}


/**
 * Convert coefficient of thermal expansion to 1/°C.
 *
 * If alpha is given per °F:
 *
 * alpha_C * ΔC = alpha_F * ΔF
 *
 * and ΔF = 9/5 ΔC,
 *
 * therefore:
 *
 * alpha_C = alpha_F * 9/5
 */
function alphaToPerC(
  value: number,
  unit: string
) {
  const u = String(unit || '')
    .trim()
    .replace(/°/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  if (
    u.includes('/f') ||
    u.includes('1/f') ||
    u.includes('fahrenheit')
  ) {
    return value * 9 / 5;
  }

  /*
   * 1/C and 1/K have the same scale for
   * temperature DIFFERENCES.
   */
  return value;
}


function applyTemperatureUnitFromAI(
  appStore: any,
  temperatureLoads: any[]
) {
  if (
    !temperatureLoads ||
    temperatureLoads.length === 0
  ) {
    return;
  }

  const unit =
    normalizeTemperatureUnit(
      temperatureLoads[0].temperature_unit
    );

  appStore.units.Temperature = unit;

  console.log(
    '[AI] Temperature-change display unit:',
    unit === 'F' ? '°F' : '°C'
  );
}

function supportDofs(
  support: string
): DofID[] {
  switch (support) {
    case 'fixed':
      return [
        DofID.Dx,
        DofID.Dz,
        DofID.Ry
      ];

    case 'pin':
      return [
        DofID.Dx,
        DofID.Dz
      ];

    case 'roller_x':
      return [DofID.Dx];

    case 'roller_z':
      return [DofID.Dz];

    case 'free':
    default:
      return [];
  }
}

function buildModel() {
  errorMessage.value = '';

  try {
    validateStructuralModel(result.value);

    const projectStore = useProjectStore();
    const appStore = useAppStore();

    applyAIUnitsToEduBeam(
      appStore,
      result.value.units
    );

    applyMemberPropertyDisplayUnits(
      appStore,
      result.value.members
    );

    applyTemperatureUnitFromAI(
      appStore,
      result.value.temperature_loads ?? []
    );

    const solver = projectStore.solver;
    const domain = solver.domain;
    const loadCase = solver.loadCases[0];

    executeModelMutationWithUndo(() => {
      loadCase.solved = false;
      loadCase.prescribedBC = [];
      loadCase.nodalLoadList = [];
      loadCase.elementLoadList = [];

      domain.elements.clear();
      domain.nodes.clear();

      projectStore.dimensions = [];

      let materialId =
        Array.from(domain.materials.keys())[0];

      if (materialId === undefined) {
        materialId = 'AI-MAT';

        domain.createMaterial(materialId, {
          e: 210000e6,
          g: 210000e6 / (2 * (1 + 0.2)),
          alpha: 12e-6,
          d: 7850
        });

        domain.materials = new Map(
          domain.materials
        );
      }

      let sectionId =
        Array.from(domain.crossSections.keys())[0];

      if (sectionId === undefined) {
        sectionId = 'AI-SECTION';

        domain.createCrossSection(sectionId, {
          a: 0.01,
          iy: 8.356e-5,
          iz: 1.0,
          dyz: 999991.0,
          h: 0.3,
          k: 1e32,
          j: 99999.0
        });

        domain.crossSections = new Map(
          domain.crossSections
        );
      }

      for (const node of result.value.nodes) {
        domain.createNode(
          String(node.id),
          [
            toMeters(
              Number(node.x),
              result.value.units.length
            ),
            0,
            engineeringZToEduBeam(
              toMeters(
                Number(node.z),
                result.value.units.length
              )
            )
          ],
          supportDofs(node.support)
        );
      }

      domain.nodes = new Map(domain.nodes);


      /*
       * Base/default properties are used ONLY where
       * the drawing does not provide member-specific data.
       */
      const baseMaterial =
        domain.materials.get(materialId);

      const baseSection =
        domain.crossSections.get(sectionId);

      if (!baseMaterial) {
        throw new Error(
          'Could not find the default EduBeam material.'
        );
      }

      if (!baseSection) {
        throw new Error(
          'Could not find the default EduBeam cross-section.'
        );
      }

      const materialCache =
        new Map<string, string>();

      const sectionCache =
        new Map<string, string>();

      let materialCounter = 1;
      let sectionCounter = 1;


      function materialForMember(
        member: any
      ) {
        if (
          !member.has_E &&
          !member.has_G &&
          !member.has_alpha
        ) {
          return materialId;
        }

        const e = member.has_E
          ? modulusToPa(
              Number(member.E_value),
              String(member.E_unit)
            )
          : Number(baseMaterial.e);

        /*
         * If G is not shown but E changes, preserve the
         * same E/G relationship as the default material.
         * This avoids inventing a completely unrelated G.
         */
        const g = member.has_G
          ? modulusToPa(
              Number(member.G_value),
              String(member.G_unit)
            )
          : (
              Number(baseMaterial.e) !== 0
                ? Number(baseMaterial.g) *
                  e /
                  Number(baseMaterial.e)
                : Number(baseMaterial.g)
            );

        const alpha = member.has_alpha
          ? alphaToPerC(
              Number(member.alpha_value),
              String(member.alpha_unit)
            )
          : Number(
              baseMaterial.alpha ?? 0
            );

        const key =
          propertyKey([e, g, alpha]);

        const cached =
          materialCache.get(key);

        if (cached) {
          return cached;
        }

        let id =
          'AI-MAT-' +
          materialCounter++;

        while (
          domain.materials.has(id)
        ) {
          id =
            'AI-MAT-' +
            materialCounter++;
        }

        domain.createMaterial(
          id,
          {
            e,
            g,

            alpha,

            d:
              Number(
                baseMaterial.d ?? 0
              )
          }
        );

        materialCache.set(
          key,
          id
        );

        return id;
      }


      function sectionForMember(
        member: any
      ) {
        if (
          !member.has_A &&
          !member.has_I &&
          !member.has_h
        ) {
          return sectionId;
        }

        const a = member.has_A
          ? areaToM2(
              Number(member.A_value),
              String(member.A_unit)
            )
          : Number(baseSection.a);

        const iy = member.has_I
          ? inertiaToM4(
              Number(member.I_value),
              String(member.I_unit)
            )
          : Number(baseSection.iy);

        const h = member.has_h
          ? toMeters(
              Number(member.h_value),
              String(member.h_unit)
            )
          : Number(
              baseSection.h ?? 1
            );

        const k =
          Number(
            baseSection.k ?? 1
          );

        const key =
          propertyKey(
            [a, iy, h, k]
          );

        const cached =
          sectionCache.get(key);

        if (cached) {
          return cached;
        }

        let id =
          'AI-SEC-' +
          sectionCounter++;

        while (
          domain.crossSections.has(id)
        ) {
          id =
            'AI-SEC-' +
            sectionCounter++;
        }

        domain.createCrossSection(
          id,
          {
            a,
            iy,
            h,
            k
          }
        );

        sectionCache.set(
          key,
          id
        );

        return id;
      }


      for (
        const member of
        result.value.members
      ) {
        const memberMaterial =
          materialForMember(member);

        const memberSection =
          sectionForMember(member);

        domain.createBeam2D(
          String(member.id),
          [
            String(
              member.start_node
            ),

            String(
              member.end_node
            )
          ],

          memberMaterial,
          memberSection,

          [
            Boolean(
              member.hinge_start
            ),

            Boolean(
              member.hinge_end
            )
          ]
        );
      }

      domain.elements = new Map(
        domain.elements
      );

      for (
        const load of
        result.value.nodal_loads ?? []
      ) {
        loadCase.createNodalLoad(
          String(load.node_id),
          {
            [DofID.Dx]: toNewtons(
              Number(load.fx),
              result.value.units.force
            ),

            [DofID.Dz]: engineeringFzToEduBeam(
              toNewtons(
                Number(load.fz),
                result.value.units.force
              )
            ),

            [DofID.Ry]: toNewtonMeters(
              Number(load.my),
              result.value.units.moment
            )
          }
        );
      }

      for (
        const load of
        result.value.distributed_loads ?? []
      ) {
        loadCase.createBeamElementUniformEdgeLoad(
          String(load.member_id),
          [
            toNewtonsPerMeter(
              Number(load.fx),
              result.value.units.distributed_load
            ),

            engineeringFzToEduBeam(
              toNewtonsPerMeter(
                Number(load.fz),
                result.value.units.distributed_load
              )
            )
          ],
          false
        );
      }

      for (
        const load of
        result.value.member_point_loads ?? []
      ) {
        loadCase.createBeamConcentratedLoad(
          String(load.member_id),
          [
            toNewtons(
              Number(load.fx),
              result.value.units.force
            ),

            engineeringFzToEduBeam(
              toNewtons(
                Number(load.fz),
                result.value.units.force
              )
            ),

            toNewtonMeters(
              Number(load.my),
              result.value.units.moment
            ),

            toMeters(
              Number(load.position_from_start),
              result.value.units.length
            )
          ],
          false
        );
      }


      /*
       * Thermal loads.
       *
       * ts-fem expects:
       *
       * [DeltaTs, DeltaTbMinusTt, 0]
       *
       * internally expressed as Celsius temperature DIFFERENCES.
       */
      for (
        const load of
        result.value.temperature_loads ?? []
      ) {
        const deltaTsC =
          temperatureDifferenceToC(
            Number(load.delta_Ts),
            String(load.temperature_unit)
          );

        const deltaGradientC =
          temperatureDifferenceToC(
            Number(load.delta_Tb_minus_Tt),
            String(load.temperature_unit)
          );

        loadCase.createBeamTemperatureLoad(
          String(load.member_id),
          [
            deltaTsC,
            deltaGradientC,
            0
          ]
        );
      }

      solver.domain = domain;
    });

    projectStore.clearSelection();
    projectStore.clearSelection2();
    projectStore.solve();

    requestAnimationFrame(() => {
      eventBus.emit(EventType.FIT_CONTENT);
    });

    closeModal();
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Could not build the EduBeam model.';
  }
}
</script>

<style scoped>
.paste-zone {
  border: 2px dashed rgba(var(--v-border-color), 0.55);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  outline: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.paste-zone:hover,
.paste-zone:focus-within {
  border-color: rgb(var(--v-theme-primary));
  background:
    rgba(var(--v-theme-primary), 0.04);
}


.json-preview {
  max-height: 320px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
