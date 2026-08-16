# EduBeam AI - Modifications and Extensions

This document summarizes the major modifications in this fork relative to the upstream EduBeam project.

## AI Model Builder

- Added multimodal structural-model generation using Gemini.
- Added structural diagram image upload.
- Added clipboard image pasting using Ctrl+V.
- Added drag-and-drop image support.
- Added selectable Gemini models.
- Added structured JSON interpretation before model generation.
- Added display of the Gemini interpretation before building the model.
- Added support for reasonable AI assumptions when information in a diagram is ambiguous.

## Structural Diagram Recognition

The AI Model Builder can interpret:

- nodes and structural joints
- beams and frame members
- member connectivity
- fixed supports
- pinned supports
- roller supports
- internal hinges and member releases
- nodal forces
- nodal moments
- member point loads
- distributed loads
- geometry and dimensions
- member-specific structural properties
- thermal loads

AI-generated models should always be reviewed before analysis.

## Member Properties

Added AI extraction and member-specific assignment of:

- Young's modulus, E
- shear modulus, G
- cross-sectional area, A
- bending moment of inertia, I
- cross-section height, h
- coefficient of thermal expansion, alpha

Different members may therefore be assigned different materials and cross-sections automatically.

## Units

Expanded and corrected unit handling.

Added or improved support for:

- SI units
- U.S. customary units
- kip
- ksi
- kip-ft
- kip-in
- kip/ft
- lbf/ft
- force-per-length conversion
- automatic recognition of source-problem units
- automatic switching of EduBeam display units

Gemini preserves source numerical values and source units. Deterministic conversion is performed only when values are transferred to the internal solver.

## Coordinate Convention

Modified the user-facing global coordinate convention to follow the conventional structural-engineering system:

- +x = right
- -x = left
- +z = upward
- -z = downward

The internal EduBeam/SVG coordinate representation remains separated from the user-facing engineering convention.

## Temperature Loads

Added/improved handling for:

- uniform member temperature changes
- through-depth temperature gradients
- Celsius temperature changes
- Fahrenheit temperature changes
- coefficient of thermal expansion
- cross-section height for thermal curvature calculations

Temperature differences are converted correctly without applying the absolute-temperature 32-degree Fahrenheit offset.

## Structural Analysis Education Features

Added a member-level equation display capability for:

- shear-force equations
- bending-moment equations

These features are intended to help students connect numerical structural-analysis results with analytical member equations.

## Upstream Project

This project is based on:

https://github.com/janvorisek/edubeam

See `ATTRIBUTION.md` and `LICENSE` for additional information.
