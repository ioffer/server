FROM node:16.16.0

WORKDIR /code

ENV PORT 80

COPY package.json /code/package.json

RUN ls
# RUN npm i --location=global yarn
RUN yarn install

COPY . /code

RUN yarn install

CMD ["yarn","start"]

EXPOSE 80