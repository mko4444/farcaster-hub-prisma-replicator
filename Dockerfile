# Use the official Node.js 16 image as a base image
FROM node:16

# Install Python and other dependencies
RUN apt-get update && apt-get install -y python3

# Create a working directory.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install npm packages
RUN npm install

# Copy the prisma directory (which contains schema.prisma) into the container
COPY ./prisma ./prisma

# Run the Prisma setup script to migrate tables
RUN npm run setup

# Copy the rest of the local files to the container's workspace.
COPY . .

# Command to run the script
CMD [ "npm", "run", "start" ]
