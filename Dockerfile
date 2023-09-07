# Use the official Node.js 16 image from the DockerHub
FROM node:16

# Set up the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json before other files
# Utilize Docker cache to save re-installing dependencies if unchanged
COPY package*.json ./

# Install necessary npm packages
RUN npm install

# Copy the local files to the container's workspace
COPY . .

# Run the Prisma setup script to migrate tables
RUN npm run setup

# Set up your environment variables
# (assuming you've got a .env file in your project directory)
COPY .env* ./

# Run your script
CMD [ "npm", "run", "start" ]
