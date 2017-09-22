//server.js
const http      = require('http'),
      fs        = require('fs')


http.createServer((request, response) => 
{
    const pagePath = request.url.substring(1) || 'drawer.html'

    console.log('sending: ', pagePath)

    if (fs.existsSync(pagePath))
    {
        let fileStream = fs.createReadStream(pagePath);
        response.writeHead(200, {'Content-Type': 'text/html'})
        fileStream.pipe(response)
    }
    else 
    {
        response.writeHead(404)
        response.end()
    }
}).listen(3000)

console.log('server listening')


//=====================================================================
//World code
//=====================================================================

class World {
    constructor() {
        this.vertices = []
        this.edges = []
    }

    placePoint({x, y, z}) {

    }

    connectPoints(point1, point2) {

    }
}


//=====================================================================
//Websocket code
//=====================================================================

const WebSocket = require('ws')


const wss = new WebSocket.Server({ port: 3001 })

wss.on('connection', function connection(ws) 
{
  ws.on('message', function incoming(message) 
  {
    console.log('received: %s', JSON.parse(message))
  })

  ws.send({msg: 'something'})
});

