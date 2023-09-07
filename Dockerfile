# Use the official Node.js 16 image as a base image
FROM node:16

# Install Python and other dependencies
RUN apt-get update && apt-get install -y python3

# Create a working directory. If you are working from the root, this should be fine.
# This simply sets a directory inside the container where your app will live.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install npm packages
RUN npm install

# Run the Prisma setup script to migrate tables
RUN npm run setup

# Copy the local files to the container's workspace.
COPY . .

# Since nothing needs to be accessed from the browser, you can omit the EXPOSE directive.

# Command to run the script, changed to use the start script from your package.json
CMD [ "npm", "run", "start" ]
