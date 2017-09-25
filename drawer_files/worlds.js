class SocketWorld 
{
    constructor() 
    {
        this.vertices = []
        this.edges = []

        this._socket = new WebSocket('ws://localhost:3000')

        this._socket.addEventListener('open', event => {
            console.log('socket connected')
        })
        
        this._socket.addEventListener('message', event => {
            const { vertices, edges } = JSON.parse(event.data)
            this.vertices = vertices
            this.edges = edges
        })
    }

    placePoint(point) 
    {
        this._socket.send(JSON.stringify({
            action: 'place',
            point: point
        }))
    }

    connectPoints(edge) 
    {
        this._socket.send(JSON.stringify({
            action: 'connect',
            edge: edge
        }))
    }

    deletePoint(pointIndex) 
    {
        this._socket.send(JSON.stringify({
            action: 'delete',
            pointIndex: pointIndex
        }))
    }
}

class LocalWorld 
{
    constructor() 
    {
        this.vertices = []
        this.edges = []

        var storedData = JSON.parse(localStorage.getItem("world"));
        if (storedData) {
            this.vertices = storedData.vertices,
            this.edges = storedData.edges
        }
    }

    placePoint(point) 
    {
        this.vertices.push(point)
        localStorage.setItem('world', JSON.stringify({
            vertices: this.vertices,
            edges: this.edges
        }));
    }

    connectPoints(edge) 
    {
        this.edges.push(edge)
        localStorage.setItem('world', JSON.stringify({
            vertices: this.vertices,
            edges: this.edges
        }));
    }

    deletePoint(pointIndex) 
    {
        this.vertices.splice(pointIndex, 1, {})
        localStorage.setItem('world', JSON.stringify({
            vertices: this.vertices,
            edges: this.edges
        }));
    }
}