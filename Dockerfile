# Use the official Node.js 16 image from the DockerHub
FROM node:16

# Set up the working directory
WORKDIR /usr/src/app

# Accept Railway's environment variables as arguments
ARG DATABASE_URL

# Set the environment variables
ENV DATABASE_URL=$DATABASE_URL

# Copy package.json and package-lock.json before other files
# Utilize Docker cache to save re-installing dependencies if unchanged
COPY package*.json ./

# Install necessary npm packages
RUN npm install

# Copy the local files to the container's workspace
COPY . .

# Run the setup script which will conditionally use values from .env file if present
COPY setup.sh .
RUN ./setup.sh

# Run your script
CMD [ "npm", "run", "start" ]
