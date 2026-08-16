import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: 'server/.env' });

if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY was not found in server/.env');
  process.exit(1);
}

const app = express();
const PORT = 3001;
const DEFAULT_MODEL = 'gemini-3.7-flash';

const ALLOWED_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const ai = new GoogleGenAI({});

const structuralSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    summary: {
      type: 'string'
    },

    units: {
      type: 'object',
      additionalProperties: false,

      properties: {
        length: {
          type: 'string'
        },

        force: {
          type: 'string'
        },

        moment: {
          type: 'string'
        },

        distributed_load: {
          type: 'string'
        }
      },

      required: [
        'length',
        'force',
        'moment',
        'distributed_load'
      ]
    },

    nodes: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          id: {
            type: 'string'
          },

          x: {
            type: 'number'
          },

          z: {
            type: 'number'
          },

          support: {
            type: 'string',
            enum: [
              'free',
              'fixed',
              'pin',
              'roller_x',
              'roller_z'
            ]
          }
        },

        required: [
          'id',
          'x',
          'z',
          'support'
        ]
      }
    },

    members: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          id: {
            type: 'string'
          },

          start_node: {
            type: 'string'
          },

          end_node: {
            type: 'string'
          },

          hinge_start: {
            type: 'boolean'
          },

          hinge_end: {
            type: 'boolean'
          },

          has_E: {
            type: 'boolean'
          },

          E_value: {
            type: 'number'
          },

          E_unit: {
            type: 'string'
          },

          has_G: {
            type: 'boolean'
          },

          G_value: {
            type: 'number'
          },

          G_unit: {
            type: 'string'
          },

          has_A: {
            type: 'boolean'
          },

          A_value: {
            type: 'number'
          },

          A_unit: {
            type: 'string'
          },

          has_I: {
            type: 'boolean'
          },

          I_value: {
            type: 'number'
          },

          I_unit: {
            type: 'string'
          },

          has_h: {
            type: 'boolean',
            description:
              'True when cross-section depth/height h relevant to thermal bending is explicitly given or clearly assigned to this member.'
          },

          h_value: {
            type: 'number'
          },

          h_unit: {
            type: 'string'
          },

          has_alpha: {
            type: 'boolean',
            description:
              'True when coefficient of thermal expansion alpha is explicitly given or clearly assigned to this member/material.'
          },

          alpha_value: {
            type: 'number'
          },

          alpha_unit: {
            type: 'string',
            description:
              'Examples: 1/C, 1/F, /C, /F, 1/K.'
          }
        },

        required: [
          'id',
          'start_node',
          'end_node',
          'hinge_start',
          'hinge_end',

          'has_E',
          'E_value',
          'E_unit',

          'has_G',
          'G_value',
          'G_unit',

          'has_A',
          'A_value',
          'A_unit',

          'has_I',
          'I_value',
          'I_unit',

          'has_h',
          'h_value',
          'h_unit',

          'has_alpha',
          'alpha_value',
          'alpha_unit'
        ]
      }
    },

    nodal_loads: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          node_id: {
            type: 'string'
          },

          fx: {
            type: 'number'
          },

          fz: {
            type: 'number'
          },

          my: {
            type: 'number'
          }
        },

        required: [
          'node_id',
          'fx',
          'fz',
          'my'
        ]
      }
    },

    distributed_loads: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          member_id: {
            type: 'string'
          },

          fx: {
            type: 'number'
          },

          fz: {
            type: 'number'
          }
        },

        required: [
          'member_id',
          'fx',
          'fz'
        ]
      }
    },

    member_point_loads: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          member_id: {
            type: 'string'
          },

          fx: {
            type: 'number'
          },

          fz: {
            type: 'number'
          },

          my: {
            type: 'number'
          },

          position_from_start: {
            type: 'number'
          }
        },

        required: [
          'member_id',
          'fx',
          'fz',
          'my',
          'position_from_start'
        ]
      }
    },

    temperature_loads: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          member_id: {
            type: 'string'
          },

          delta_Ts: {
            type: 'number',
            description:
              'Uniform/mean axial temperature CHANGE, preserving the numerical value in the source unit.'
          },

          delta_Tb_minus_Tt: {
            type: 'number',
            description:
              'Bottom-fiber temperature change minus top-fiber temperature change, preserving the numerical value in the source unit.'
          },

          temperature_unit: {
            type: 'string',
            enum: [
              'C',
              'F'
            ],
            description:
              'C for Celsius temperature changes, F for Fahrenheit temperature changes.'
          }
        },

        required: [
          'member_id',
          'delta_Ts',
          'delta_Tb_minus_Tt',
          'temperature_unit'
        ]
      }
    },

    uncertainties: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  },

  required: [
    'summary',
    'units',
    'nodes',
    'members',
    'nodal_loads',
    'distributed_loads',
    'member_point_loads',
    'temperature_loads',
    'uncertainties'
  ]
};

const extractionInstructions = `
============================================================
THERMAL LOADS — CRITICAL
============================================================

You MUST detect temperature/thermal loads shown in structural
diagrams.

Do NOT ignore them.

EduBeam represents a member thermal load using:

1. delta_Ts
   Uniform or mean axial temperature CHANGE through the section.

2. delta_Tb_minus_Tt
   Bottom-fiber temperature CHANGE minus top-fiber temperature
   CHANGE.

The first produces uniform thermal expansion/contraction.

The second produces thermal curvature/bending.

============================================================
TEMPERATURE UNITS
============================================================

Temperature loads are TEMPERATURE CHANGES, not absolute
temperatures.

Preserve the numerical value and source temperature unit.

DO NOT numerically convert Celsius to Fahrenheit.
DO NOT numerically convert Fahrenheit to Celsius.

Examples:

Image:
Delta T = +40 C

Return:
delta_Ts = 40
temperature_unit = "C"

Image:
Delta T = +90 F

Return:
delta_Ts = 90
temperature_unit = "F"

Do NOT change 90 F to 50 C yourself.

The EduBeam conversion layer will do any required internal
conversion.

Recognize these as Celsius:
C
°C
deg C
degrees C
Celsius

Recognize these as Fahrenheit:
F
°F
deg F
degrees F
Fahrenheit

============================================================
UNIFORM TEMPERATURE CHANGE
============================================================

If the entire member has a uniform temperature change:

Delta T = +30 C

then:

delta_Ts = 30
delta_Tb_minus_Tt = 0
temperature_unit = "C"

If cooling is shown:

Delta T = -20 C

then:

delta_Ts = -20
delta_Tb_minus_Tt = 0

============================================================
TEMPERATURE GRADIENT
============================================================

If the image directly specifies:

Delta Ts
and
Delta Tb - Delta Tt

preserve those values exactly.

Example:

Delta Ts = 20 C
Delta Tb - Delta Tt = 15 C

Return:

delta_Ts = 20
delta_Tb_minus_Tt = 15
temperature_unit = "C"

============================================================
TOP AND BOTTOM TEMPERATURE CHANGES
============================================================

If the image instead gives TOP and BOTTOM temperature CHANGES:

Delta T_top
Delta T_bottom

and the temperature distribution is clearly linear through the
member depth, calculate:

delta_Ts =
(Delta T_bottom + Delta T_top) / 2

delta_Tb_minus_Tt =
Delta T_bottom - Delta T_top

Example:

top:    +10 C
bottom: +30 C

Return:

delta_Ts = 20
delta_Tb_minus_Tt = 20
temperature_unit = "C"

Example:

top:    +20 F
bottom: +50 F

Return:

delta_Ts = 35
delta_Tb_minus_Tt = 30
temperature_unit = "F"

Again: preserve Fahrenheit numbers as Fahrenheit.
Do not convert them to Celsius.

If it is unclear whether the labels are absolute temperatures
or temperature CHANGES, make the most reasonable engineering
interpretation and report the assumption in uncertainties.

============================================================
MEMBER ASSIGNMENT
============================================================

Apply a thermal load only to the member or member group to which
the diagram assigns it.

If one temperature change applies to several members, create one
temperature_load entry for EACH affected member.

Do not apply a thermal load globally unless the image clearly
indicates that it applies globally.

============================================================
THERMAL MATERIAL / SECTION DATA
============================================================

Thermal analysis may depend on:

E
A
I
h
alpha

You must preserve these values whenever they are shown.

h = cross-section depth/height relevant to the thermal gradient.

alpha = coefficient of thermal expansion.

Do NOT invent alpha or h if they are not supplied.

If alpha or h is not shown, set:

has_alpha = false
alpha_value = 0
alpha_unit = ""

has_h = false
h_value = 0
h_unit = ""

EduBeam will then inherit its existing material/cross-section
values.

If alpha is shown, preserve its number and unit.

Examples:

alpha = 12e-6 /C

return:
has_alpha = true
alpha_value = 0.000012
alpha_unit = "1/C"

alpha = 6.5e-6 /F

return:
has_alpha = true
alpha_value = 0.0000065
alpha_unit = "1/F"

DO NOT convert alpha numerically.

============================================================
FINAL THERMAL CHECK
============================================================

Before returning the JSON, verify:

- Did the figure contain a temperature load?
- Which members receive it?
- Is it uniform or a gradient?
- Is the unit Celsius or Fahrenheit?
- Is alpha shown?
- Is cross-section height h shown?
- Did I accidentally discard thermal information?

============================================================

\n============================================================\nMEMBER STIFFNESS AND SECTION PROPERTIES\n============================================================\n\nStructural/member properties shown in the image are CRITICAL.\n\nYou MUST detect and preserve member-specific:\n\n- Young modulus E\n- shear modulus G when shown\n- cross-sectional area A when shown\n- bending moment of inertia I when shown\n\nDO NOT ignore these quantities.\n\nThey may be shown:\n\n- directly beside a member\n- using arrows or leader lines\n- in a table\n- in a legend\n- as a property assigned to a group of members\n- as a global property applying to all members\n- with different values for different member groups\n\nIf one property applies to several members, REPEAT that\nproperty on every affected member in the JSON.\n\nExample:\n\nAB and BC: E = 29000 ksi, I = 500 in4\nCD:        E = 10000 ksi, I = 800 in4\n\nThen AB and BC must each contain:\n\nhas_E = true\nE_value = 29000\nE_unit = ksi\nhas_I = true\nI_value = 500\nI_unit = in4\n\nand CD must contain its own values.\n\nIMPORTANT:\n\nDO NOT numerically convert these values.\n\n29000 ksi must remain:\n\nE_value = 29000\nE_unit = ksi\n\nNOT:\n\nE_value = 199947961501\nE_unit = Pa\n\nUse canonical property-unit labels where possible:\n\nE / G:\nPa, kPa, MPa, GPa, psi, ksi\n\nArea A:\nm2, cm2, mm2, in2, ft2\n\nMoment of inertia I:\nm4, cm4, mm4, in4, ft4\n\nIf a property is NOT supplied for a particular member:\n\nhas_E = false, E_value = 0, E_unit = ""\nhas_G = false, G_value = 0, G_unit = ""\nhas_A = false, A_value = 0, A_unit = ""\nhas_I = false, I_value = 0, I_unit = ""\n\nDo NOT invent E, G, A, or I merely because you know\ntypical material properties.\n\nIf a label is ambiguous, make the most reasonable\ninterpretation and record the assumption in uncertainties.\n\nA visible E/I/A/G value must NEVER be discarded merely\nbecause it does not affect support reactions.\n\n============================================================\n
============================================================
CANONICAL UNIT LABELS
============================================================

NEVER numerically convert a value.

Preserve the numerical values shown in the image.

However, normalize unit LABELS to these canonical forms:

LENGTH:
m
cm
mm
ft
in

FORCE:
N
kN
MN
lbf
kip
kgf
Tonf

Examples of label normalization:

20 k       -> value 20, unit kip
20 kips    -> value 20, unit kip
500 lb     -> value 500, unit lbf

6 ft       -> value 6, unit ft
24 in      -> value 24, unit in

2.5 k/ft   -> value 2.5, unit kip/ft
10 kN/m    -> value 10, unit kN/m

30 k-ft    -> value 30, unit kip*ft
20 kN-m    -> value 20, unit kN*m

IMPORTANT:

NORMALIZING THE UNIT NAME IS ALLOWED.

CHANGING THE NUMBER IS NOT.

For example:

20 kN must remain 20 kN.
Do NOT change it to 20000 N.

12 ft must remain 12 ft.
Do NOT change it to 3.6576 m.

============================================================


============================================================
ABSOLUTE UNIT RULE — NEVER CONVERT NUMERICAL UNITS


IMPORTANT UNIT-LABEL RULE:

Preserve the NUMERICAL VALUE exactly as shown, but return a complete,
standard unit LABEL.

For example:

20 kN in the image
-> value 20, force unit "kN"

10 kN/m in the image
-> value 10, distributed-load unit "kN/m"

35 kN*m in the image
-> value 35, moment unit "kN*m"

12 ft in the image
-> value 12, length unit "ft"

Do NOT abbreviate "kN" as "k".
Do NOT abbreviate "N" away.
Do NOT return incomplete units such as:
"k", "k/", "/m", "lb/", or similar fragments.

Unit-label normalization does NOT count as numerical conversion.

For example, if the image uses:
kN·m

you may return:
kN*m

but the numerical magnitude must remain unchanged.
============================================================

You MUST preserve the numerical values and units shown in the
source structural diagram.

DO NOT convert quantities to SI.
DO NOT convert quantities to Imperial.
DO NOT convert between unit systems.

Examples:

If image shows:
20 kN

return:
value = 20
force unit = kN

DO NOT return 20000 N.

If image shows:
12 ft

return:
value = 12
length unit = ft

DO NOT return 3.6576 m.

If image shows:
5 kip/ft

return:
value = 5
distributed-load unit = kip/ft.

The JSON "units" object must report the units represented by the
numbers in the source image.

Unit-label normalization is acceptable:
kN·m may be represented as kN*m.

But the NUMERICAL VALUE must not be changed.

If a unit is not explicitly shown but can be determined from
other labels in the drawing, use that same unit.

If a unit genuinely cannot be determined, make a reasonable
assumption and report it in uncertainties.

============================================================


You are an expert structural-analysis diagram reconstruction system.

Your task is NOT to solve the structure.

Your task is to reconstruct the structural model shown in the uploaded
image as faithfully as possible so that another program can reproduce
the same structure.

============================================================
PRIMARY RULE: THE IMAGE IS AUTHORITATIVE
============================================================

When information is clearly visible in the image, reproduce it exactly.

Do NOT:
- simplify visible geometry
- redesign the structure
- remove visible members
- add unnecessary members
- change visible connectivity
- replace unusual geometry with a more conventional structure
- assume symmetry when the drawing is visibly asymmetric
- merge visible structural joints
- combine multiple visible member segments across an intermediate joint

The generated model should LOOK like the structure in the source image.

============================================================
REASONABLE ASSUMPTIONS ARE ALLOWED
============================================================

If information is genuinely missing, blurry, cropped, ambiguous,
or impossible to determine exactly, make the most reasonable
engineering assumption.

Examples:
- ambiguous pin versus roller symbol
- unreadable dimension
- unclear member length
- uncertain hinge symbol
- missing physical scale
- slightly unclear connection location

When making an assumption:

1. choose the most likely interpretation,
2. continue constructing the model,
3. record the assumption in the "uncertainties" array.

Do NOT refuse to build the model merely because something is uncertain.

Example:

"Assumed support D is a roller because the support symbol is partially obscured."

============================================================
GEOMETRY MUST FOLLOW THE IMAGE
============================================================

Preserve:

- relative horizontal positions
- relative vertical positions
- member inclinations
- member angles
- story heights
- bay widths
- offsets
- eccentricities
- stepped geometry
- irregular geometry
- short members
- intermediate joints
- visible gaps
- visible connectivity

If exact physical dimensions are available, use them.

If some dimensions are missing, estimate the missing geometry from
the proportions shown in the image while preserving the visual shape.

If no dimensions are provided at all, choose a convenient scale while
preserving the relative proportions and geometry of the drawing.

Report this assumption in uncertainties.

============================================================
COORDINATE SYSTEM
============================================================

Use the engineering global coordinate system:

+X = right
-X = left

+Z = up
-Z = down

Choose a convenient structural joint as the origin, normally the
lower-left meaningful structural joint unless explicit coordinates
or dimensions indicate otherwise.

============================================================
NODES AND JOINTS
============================================================

Create a node at every actual structural joint visible in the image.

This includes:

- member endpoints
- connected member intersections
- intermediate joints
- internal hinges
- locations where several members visibly connect

If:

A------B------C

contains a visible structural joint at B, create:

AB
BC

Do NOT replace it with one member AC.

Crossing members should only be connected when the image indicates
that they actually form a joint.

Preserve visible node labels exactly.

If no labels are shown, generate:
N1, N2, N3, ...

============================================================
MEMBERS
============================================================

Create structural members corresponding to the visible structural
segments between joints.

The resulting arrangement should visually match the source image.

Do not omit short or inclined members merely because they appear
structurally unimportant.

Do not create invisible members solely to make the model more
structurally conventional.

============================================================
SUPPORTS
============================================================

Recognize:

- fixed
- pin
- roller_x
- roller_z
- free

Use the visible support symbol whenever it is clear.

If the symbol is unclear, make the most likely interpretation and
record the assumption in uncertainties.

roller_z:
restrains global vertical Z movement; typical roller on horizontal ground.

roller_x:
restrains global horizontal X movement; typical roller against a vertical surface.

============================================================
HINGES
============================================================

Only create an internal/member-end hinge when:

- a hinge symbol is visible, OR
- the image strongly implies a hinge and the symbol is ambiguous.

Do NOT automatically convert ordinary joints into hinges simply
because doing so would make the structure statically determinate.

If a hinge interpretation is uncertain, make the most likely choice
and record it in uncertainties.

============================================================
LOADS
============================================================

Reproduce the loads shown in the image.

Global convention:

rightward force = +Fx
leftward force = -Fx
upward force = +Fz
downward force = -Fz

A point load located at a structural joint:
use nodal_load.

A point load located between member endpoints:
use member_point_load.

A distributed load:
associate it with the member/span over which the load is visibly drawn.

Preserve:
- load direction
- load magnitude
- load application location
- loaded span

Do not add loads that are not shown.

============================================================
DIMENSIONS AND UNITS
============================================================

Prefer explicitly shown dimensions.

Use dimensional chains whenever possible.

Convert quantities to SI:

length -> meters
force -> Newtons
distributed force -> Newtons per meter
moment -> Newton-meters

Examples:

5 kN = 5000 N
20 kN/m = 20000 N/m
3 ft = 0.9144 m

If dimensions must be estimated from the image, preserve the visible
proportions and report the estimate in uncertainties.

============================================================
IMPORTANT VISUAL FIDELITY CHECK
============================================================

Before returning the model, compare your reconstruction mentally with
the uploaded image.

Ask:

- Does the overall silhouette match?
- Are the same joints present?
- Are the same member segments present?
- Are inclined members inclined in the same direction?
- Are offsets preserved?
- Are the supports at the same locations?
- Are hinges at the same locations?
- Are loads applied at the same locations?
- Are unequal spans/heights still unequal?
- Did I accidentally simplify the structure?

Correct any discrepancy before returning the JSON.

============================================================
ASSUMPTIONS
============================================================

Reasonable assumptions are allowed and encouraged when necessary.

However, an assumption should fill in missing information rather than
contradict clearly visible information.

Record meaningful assumptions in "uncertainties".

The goal is:

FAITHFUL VISUAL RECONSTRUCTION
+
REASONABLE ENGINEERING INFERENCE WHERE NECESSARY

Return only data satisfying the provided JSON schema.
`;


/* ============================================================
   AI UNIT NORMALIZATION

   Numerical values are NEVER changed here.
   Only unit labels are normalized.
   ============================================================ */

function cleanAIUnit(value) {
  return String(value ?? '')
    .trim()
    .replace(/·/g, '*')
    .replace(/⋅/g, '*')
    .replace(/−/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
}


function canonicalLengthUnit(value) {
  const u = cleanAIUnit(value);

  const aliases = {
    m: 'm',
    meter: 'm',
    meters: 'm',
    metre: 'm',
    metres: 'm',

    cm: 'cm',
    centimeter: 'cm',
    centimeters: 'cm',
    centimetre: 'cm',
    centimetres: 'cm',

    mm: 'mm',
    millimeter: 'mm',
    millimeters: 'mm',
    millimetre: 'mm',
    millimetres: 'mm',

    ft: 'ft',
    foot: 'ft',
    feet: 'ft',
    "'": 'ft',
    "′": 'ft',

    in: 'in',
    inch: 'in',
    inches: 'in',
    '"': 'in',
    '″': 'in'
  };

  return aliases[u] ?? value;
}


function canonicalForceUnit(
  value,
  lengthUnit,
  allUnits
) {
  const u = cleanAIUnit(value);
  const length = canonicalLengthUnit(
    lengthUnit
  );

  const aliases = {
    n: 'N',
    newton: 'N',
    newtons: 'N',

    kn: 'kN',
    kilonewton: 'kN',
    kilonewtons: 'kN',

    mn: 'MN',
    meganewton: 'MN',
    meganewtons: 'MN',

    lbf: 'lbf',
    lb: 'lbf',
    lbs: 'lbf',
    pound: 'lbf',
    pounds: 'lbf',

    kip: 'kip',
    kips: 'kip',
    klb: 'kip',

    kgf: 'kgf',

    tonf: 'Tonf',
    tf: 'Tonf'
  };

  if (aliases[u]) {
    return aliases[u];
  }

  /*
   * "k" is widely used on US structural drawings
   * to mean kip.
   *
   * But if the figure is clearly metric, interpret
   * an isolated "k" as kN instead.
   */
  if (u === 'k') {
    const combined =
      cleanAIUnit(
        JSON.stringify(allUnits ?? {})
      );

    if (
      combined.includes('kn') ||
      ['m', 'cm', 'mm'].includes(length)
    ) {
      return 'kN';
    }

    return 'kip';
  }

  return value;
}


function canonicalMomentUnit(
  value,
  force,
  length
) {
  let u = cleanAIUnit(value);

  const aliases = {
    nm: 'N*m',
    'n*m': 'N*m',
    'n-m': 'N*m',

    nmm: 'N*mm',
    'n*mm': 'N*mm',
    'n-mm': 'N*mm',

    knm: 'kN*m',
    'kn*m': 'kN*m',
    'kn-m': 'kN*m',

    mnm: 'MN*m',
    'mn*m': 'MN*m',

    'lb*ft': 'lbf*ft',
    'lb-ft': 'lbf*ft',
    'lbf*ft': 'lbf*ft',
    'lbf-ft': 'lbf*ft',

    'lb*in': 'lbf*in',
    'lb-in': 'lbf*in',
    'lbf*in': 'lbf*in',
    'lbf-in': 'lbf*in',

    'k*ft': 'kip*ft',
    'k-ft': 'kip*ft',
    'kip*ft': 'kip*ft',
    'kip-ft': 'kip*ft',
    'kips*ft': 'kip*ft',

    'k*in': 'kip*in',
    'k-in': 'kip*in',
    'kip*in': 'kip*in',
    'kip-in': 'kip*in',

    'tonf*m': 'Tonf*m',
    'tonf-m': 'Tonf*m'
  };

  if (aliases[u]) {
    return aliases[u];
  }

  /*
   * If the source contains no moment unit,
   * use the drawing's force x length units.
   */
  if (!u) {
    return force + '*' + length;
  }

  return value;
}


function canonicalDistributedUnit(
  value,
  force,
  length
) {
  let u = cleanAIUnit(value);

  /*
   * Common US structural shorthand:
   *
   * k/ft  = kip/ft
   * k/lf  = kip/ft
   * klf   = kip/ft
   * plf   = lbf/ft
   */
  const aliases = {
    'k/ft': 'kip/ft',
    'kip/ft': 'kip/ft',
    'kips/ft': 'kip/ft',
    'k/lf': 'kip/ft',
    klf: 'kip/ft',

    'k/in': 'kip/in',
    'kip/in': 'kip/in',

    plf: 'lbf/ft',
    'lb/ft': 'lbf/ft',
    'lbs/ft': 'lbf/ft',
    'lbf/ft': 'lbf/ft',

    'lb/in': 'lbf/in',
    'lbf/in': 'lbf/in',

    'n/m': 'N/m',
    'kn/m': 'kN/m',
    'mn/m': 'MN/m',

    'n/mm': 'N/mm',
    'kn/mm': 'kN/mm',

    'tonf/m': 'Tonf/m'
  };

  if (aliases[u]) {
    return aliases[u];
  }

  if (!u) {
    return force + '/' + length;
  }

  return value;
}


function canonicalizeAIUnits(input) {
  const original = input ?? {};

  const length =
    canonicalLengthUnit(
      original.length
    );

  const force =
    canonicalForceUnit(
      original.force,
      length,
      original
    );

  const moment =
    canonicalMomentUnit(
      original.moment,
      force,
      length
    );

  const distributed_load =
    canonicalDistributedUnit(
      original.distributed_load,
      force,
      length
    );

  return {
    length,
    force,
    moment,
    distributed_load
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    defaultModel: DEFAULT_MODEL,
    availableModels: ALLOWED_MODELS
  });
});

app.post('/api/structural-model', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType,
      instruction = '',
      model = DEFAULT_MODEL
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'No image data was received.'
      });
    }

    if (!mimeType || !mimeType.startsWith('image/')) {
      return res.status(400).json({
        error: 'A valid image MIME type is required.'
      });
    }

    const selectedModel =
      ALLOWED_MODELS.includes(model)
        ? model
        : DEFAULT_MODEL;

    const userNote = String(instruction || '').trim();

    const prompt = `
${extractionInstructions}

OPTIONAL USER NOTE:
${userNote || '(No additional user instruction was provided.)'}
`;

    console.log(`[AI] Sending structural image to ${selectedModel}...`);

    const interaction = await ai.interactions.create({
      model: selectedModel,

      input: [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image',
          data: imageBase64,
          mime_type: mimeType
        }
      ],

      generation_config: {
        thinking_level: 'medium'
      },

      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: structuralSchema
      },

      store: false
    });

    if (!interaction.output_text) {
      throw new Error('Gemini returned no JSON output.');
    }

    const structuralModel = JSON.parse(interaction.output_text);

    structuralModel.units =
      canonicalizeAIUnits(
        structuralModel.units
      );

    console.log(
      '[AI] Source units:',
      structuralModel.units
    );

    console.log(
      `[AI] Done. ${model.nodes?.length ?? 0} nodes, ` +
      `${structuralModel.members?.length ?? 0} members.`
    );

    res.json(structuralModel);
  } catch (error) {
    console.error('[AI ERROR]', error);

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Unknown Gemini API error.'
    });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('==============================================');
  console.log(' EduBeam AI server is running');
  console.log(` http://localhost:${PORT}`);
  console.log(` Default model: ${DEFAULT_MODEL}`);
  console.log('==============================================');
  console.log('');
});
