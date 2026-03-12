FROM apify/actor-node:20

COPY package*.json ./
RUN npm install --omit=dev --no-optional
COPY . ./
RUN npm run build

CMD npm run start:prod
