FROM alpine:3.18

# Install required packages
RUN apk add --no-cache curl coreutils

# Set working directory
WORKDIR /app

# Copy handler script and other necessary files
COPY handler.sh .
RUN chmod +x handler.sh

COPY healthcheck.sh .
RUN chmod +x healthcheck.sh

# Set the entry point to run handler.sh
ENTRYPOINT ["/bin/sh", "./handler.sh"]
