FROM alpine:3.18

# Install required packages
RUN apk add --no-cache wget coreutils

# Set working directory
WORKDIR /app

# Copy handler script and other necessary files
COPY handler.sh .
RUN chmod +x handler.sh

# Set the entry point to run handler.sh
ENTRYPOINT ["/bin/sh", "./handler.sh"]
