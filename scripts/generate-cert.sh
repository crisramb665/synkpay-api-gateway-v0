mkdir -p cert
openssl req -nodes -new -x509 -keyout cert/key.pem -out cert/cert.pem -days 365 \
    -subj "/C=XX/ST=Dev/L=Localhost/O=DevOrg/CN=localhost"