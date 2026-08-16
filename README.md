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


## Example Workflow

The AI Model Builder can interpret a structural-analysis problem from an image, review the extracted structural information, and construct the corresponding model in EduBeam AI.

### 1. Original Structural Problem

![Original structural problem](docs/screenshots/image4.png)

### 2. Upload or Paste the Problem into AI Build

Users can upload, drag-and-drop, or paste a structural diagram directly into the AI Model Builder.

![AI Model Builder](docs/screenshots/image1.png)

### 3. Review the Gemini Interpretation

Before building the model, EduBeam AI displays the interpreted structure, units, loads, supports, properties, and any uncertainties for review.

![Gemini structural interpretation](docs/screenshots/image2.png)

### 4. Build, Solve, and Review Structural Equations

The interpreted model is constructed in EduBeam, where users can solve the structure and inspect analysis results. The Show Equations tool can also display member-level shear-force and bending-moment equations.

![Generated EduBeam model with shear and moment equations](docs/screenshots/image3.png)



# Installation

## Requirements

Install:

- Git
- Node.js 20 or newer
- npm
- A Gemini API key if you want to use the AI Model Builder

## 1. Clone the Repository

Open a terminal and clone the repository:

```bash
git clone https://github.com/furkan-luleci/edubeam-ai.git
cd edubeam-ai
```

## 2. Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

This only needs to be done the first time you install EduBeam AI, or whenever the project dependencies change.

## 3. Configure the Gemini API Key

The Gemini API key is required only if you want to use the **AI Model Builder**.

A template environment file is provided at:

```text
server/.env.example
```

Create a copy named:

```text
server/.env
```

### Windows PowerShell

```powershell
Copy-Item server\.env.example server\.env
```

### macOS or Linux

```bash
cp server/.env.example server/.env
```

Open `server/.env` and replace:

```text
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
```

with your Gemini API key:

```text
GEMINI_API_KEY=your_api_key_here
```

> **Important:** Do not share or commit your API key. The `server/.env` file is excluded from Git tracking.

## 4. Run EduBeam AI

To start both the EduBeam application and the AI server, run:

```bash
npm run dev:ai
```

This starts:

* EduBeam AI frontend: `http://localhost:3000`
* AI server: `http://localhost:3001`

Open the following address in your web browser:

```text
http://localhost:3000
```

EduBeam AI is now ready to use.

## 5. Run Without the AI Model Builder

If you only want to use EduBeam without the Gemini-powered AI Model Builder, run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

A Gemini API key is not required when running EduBeam without the AI Model Builder.

## Starting EduBeam AI Again Later

After the initial installation, you do not need to run `npm install` every time.

Open a terminal, navigate to the repository, and run:

```bash
cd edubeam-ai
npm run dev:ai
```

To stop the application, press:

```text
Ctrl+C
```
