# Use an official Node.js image as the base image
FROM node:14.21.3

# Set the working directory inside the container


# Copy package.json and package-lock.json to the working directory
COPY package.json /app/
COPY src /app/
COPY public /app/
WORKDIR /usr/src/app/

# Install dependencies
RUN npm install

# Copy the rest of your application code to the working directory
COPY . .

# Build your application (if needed)
# RUN npm run build

# Expose the port your Node.js application is listening on
EXPOSE 3000

# Specify the command to run your Node.js application
CMD ["npm", "start"]  