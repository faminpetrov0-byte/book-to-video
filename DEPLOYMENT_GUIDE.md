# Deployment Guide

## Prerequisites
- Ubuntu 22 or higher
- Node.js and npm installed
- Vercel CLI installed

## Step 1: Setting Up Your Backend Server
1. **Update the System**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Installing Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Clone Your Backend Repository**:
   ```bash
   git clone <your-backend-repo-url>
   cd <your-backend-repo-folder>
   ```

4. **Install Dependencies**:
   ```bash
   npm install
   ```

5. **Start Your Backend Server**:
   ```bash
   npm start
   ```

## Step 2: Deploying the Frontend on Vercel
1. **Clone Your Frontend Repository**:
   ```bash
   git clone <your-frontend-repo-url>
   cd <your-frontend-repo-folder>
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy Your Frontend**:
   ```bash
   vercel --prod
   ```

## Conclusion
You should now have your backend server running and your frontend successfully deployed on Vercel!