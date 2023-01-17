import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { WritableStream, TransformStream } from 'node:stream/web';
import { setTimeout } from 'node:timers/promises';
import csvtojson from 'csvtojson';

const PORT = 3000;

createServer(async (request, response) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
  };

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers);

    return response.end();
  }

  let items = 0;

  request.once('close', () => console.log(`connection was closed!`, items));

  // Readable is method to create a stream to read data
  // we are using toWeb to convert this stream to a web stream
  Readable.toWeb(createReadStream('./animeflv.csv'))
    // the way that every chunk will pass
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const data = JSON.parse(Buffer.from(chunk).toString());

          const mappedData = {
            title: data.title,
            description: data.description,
            url_anime: data.url_anime,
          };

          // concat is necessary here because the format of file is NDJSON (separate json blocks by break lines)
          controller.enqueue(JSON.stringify(mappedData).concat('\n'));
        },
      })
    )
    // pipeTo is used as last phase
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          await setTimeout(1000);

          items++;

          response.write(chunk);
        },
        close() {
          response.end();
        },
      })
    );

  response.writeHead(200, headers);
})
  .listen(PORT)
  .on('listening', () => console.log(`server is running at ${PORT}`));
