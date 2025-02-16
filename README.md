# Hepnovate UI Project

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/hepnovate.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd hepnovate
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

   **Key Dependencies:**
   - Next.js, React, TailwindCSS for the core framework and styling
   - Radix UI components for accessible UI elements
   - FFmpeg libraries for audio/video processing
   - Date utilities and icons for enhanced functionality

### Running the Project

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access the application:**
   Open your browser and navigate to `http://localhost:3001`.

### Project Structure

- **`src/app/`**: Contains the main pages of the application.
  - `page.tsx`: The home page.
  - `diagnosis/page.tsx`: The diagnosis page.
  - `scan/page.tsx`: The scan page.
- **`src/components/`**: Contains reusable UI components.
  - `layout/Header.tsx`: The header component.
  - Various Radix UI components for interactive elements
- **`src/lib/`**: Contains utility functions and shared logic.
  - Audio/video processing utilities
  - Date formatting and manipulation
