# Hepnovate UI Project

## What is Hepnovate?
Hepnovate is a web application that helps people understand and manage liver health. It allows users to look at medical history, lab results, and diagnostic images.

## Getting Started

### What You Need
- **Node.js** (version 18 or higher)
- **npm** (version 9 or higher)
- **Git**

### How to Install

1. **Clone the repository**: This means you will make a copy of the project on your computer.
   ```bash
   git clone https://github.com/your-username/hepnovate.git
   ```

2. **Go to the project folder**:
   ```bash
   cd hepnovate
   ```

3. **Install the necessary packages**: This will download everything you need to run the project.
   ```bash
   npm install
   ```

### Running the Project

1. **Start the server**: This will run the application on your computer.
   ```bash
   npm run dev
   ```

2. **Open the application**: Go to your web browser and type in `http://localhost:3001` to see the app.

## How to Use the Application
- Go to the **Diagnosis** page to check patient data.
- Use the **Scan** page to see diagnostic images.

## API Endpoints
- **POST /api/detect-symptoms**: This endpoint takes a list of symptoms and gives back detected symptoms and vital signs.
- **POST /api/saveImage**: This endpoint saves an image to a specified location.
- **POST /api/diagnose**: This endpoint analyzes a medical scan image and provides a diagnosis based on symptoms and medical history.

## Project Structure
- **`src/app/`**: This folder has the main pages of the application.
- **`src/components/`**: This folder contains reusable parts of the user interface.
- **`src/lib/`**: This folder has utility functions that help the application work.
