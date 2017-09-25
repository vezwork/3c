//server.js
const http      = require('http'),
      fs        = require('fs')


const server = http.createServer((request, response) => 
{
    const pagePath = request.url.substring(1) || 'drawer.html'

    console.log('sending: ', pagePath)

    if (fs.existsSync(pagePath))
    {
        let fileStream = fs.createReadStream(pagePath);
        response.writeHead(200, {'Content-Type': 'text/html'})
        if (pagePath === 'drawer.html')
            response.write('<div id="data-port">' + (process.env.PORT || 3000) + '</div>')
        console.log('<div id="data-port">' + (process.env.PORT || 3000) + '</div>')
        fileStream.pipe(response)
    }
    else 
    {
        response.writeHead(404)
        response.end()
    }
})
server.listen(process.env.PORT || 3000, function listening() {
    console.log('Listening on %d', server.address().port);
})

//=====================================================================
//World code
//=====================================================================

class World {
    constructor() {
        this.vertices = []
        this.edges = []
    }

    placePoint(point) 
    {
        this.vertices.push(point)
    }

    connectPoints(edge) 
    {
        this.edges.push(edge)
    }

    deletePoint(pointIndex) 
    {
        this.vertices.splice(pointIndex, 1, {})
    }
}
const world = new World()


//=====================================================================
//Websocket code
//=====================================================================

const WebSocket = require('ws')

const wss = new WebSocket.Server({ server })

const actionHandlers = {
    place: data => world.placePoint(data.point),
    connect: data => world.connectPoints(data.edge),
    delete: data => world.deletePoint(data.pointIndex)
}

wss.on('connection', function connection(ws)
{
    ws.on('message', function incoming(message) 
    {
        const data = JSON.parse(message)
        console.log('message recieved', data)
        actionHandlers[data.action](data)
        console.log('new world: ', world)

        ws.send(JSON.stringify(world))
    })

    ws.send(JSON.stringify(world))
})

function worldUpdateLoop() {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(world))
        }
    })
}

setInterval(worldUpdateLoop, 100)
