# EduBeam AI

EduBeam AI is an AI-enhanced structural-analysis and education platform based on the open-source EduBeam project.

> **Project relationship:** This repository is an unofficial modified fork of EduBeam by Jan Voříšek and contributors. The original project is available at https://github.com/janvorisek/edubeam.

## Major Additions

This fork adds:

- Gemini-powered AI Model Builder
- Structural diagram image upload
- Drag-and-drop image input
- Clipboard image paste with Ctrl+V
- Selectable Gemini models
- Automatic recognition of nodes and members
- Automatic recognition of supports and internal hinges
- Automatic recognition of nodal loads
- Automatic recognition of member point loads
- Automatic recognition of distributed loads
- Automatic recognition of structural dimensions
- Automatic SI and U.S. customary unit recognition
- Automatic display-unit selection
- Engineering coordinate convention with +z upward
- kip and ksi support
- Correct force-per-length conversion
- Member-specific Young's modulus E
- Member-specific shear modulus G
- Member-specific cross-sectional area A
- Member-specific moment of inertia I
- Cross-section height h support
- Thermal expansion coefficient alpha support
- Temperature-load recognition
- Celsius and Fahrenheit temperature-change handling
- Shear-force equation display
- Bending-moment equation display

## Important: Verify AI-Generated Models

The AI Model Builder assists with structural model creation but does not replace engineering verification.

Before solving an AI-generated model, verify:

- geometry
- dimensions
- member connectivity
- support conditions
- internal hinges and releases
- load magnitudes
- load directions
- load locations
- units
- E, G, A, and I
- cross-section properties
- thermal loads
- coefficient of thermal expansion

A finite-element model can solve successfully even when the source structural diagram was interpreted incorrectly.

# Installation

## Requirements

Install:

- Git
- Node.js 20 or newer
- npm
- A Gemini API key if you want to use the AI Model Builder

## 1. Clone the Repository

```bash
git clone https://github.com/furkan-luleci/edubeam-ai.git
cd edubeam-ai