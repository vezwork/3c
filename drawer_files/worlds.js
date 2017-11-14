class SocketWorld 
{
    constructor() 
    {
        this.vertices = []
        this.edges = []

        this._socket = new WebSocket(document.getElementById('data-port').innerHTML)

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
            point
        }))
    }

    connectPoints(edge) 
    {
        this._socket.send(JSON.stringify({
            action: 'connect',
            edge
        }))
    }

    deletePoint(pointIndex) 
    {
        this._socket.send(JSON.stringify({
            action: 'delete',
            pointIndex
        }))
    }

    addSubGraph({ points=[], edges=[] }) {
        this._socket.send(JSON.stringify({
            action: 'subgraph',
            points,
            edges
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
        this._save()
    }

    connectPoints(edge) 
    {
        this.edges.push(edge)
        this._save()
    }

    deletePoint(pointIndex) 
    {
        this.vertices.splice(pointIndex, 1, {})
        this._save()
    }

    addSubGraph({ points=[], edges=[] }) {
        const pointIndices = points.map(p => 
            this.vertices.push(p) - 1
        )
        console.log(pointIndices, edges)
        edges.forEach(e => 
            this.edges.push([pointIndices[e[0]], pointIndices[e[1]]])
        )
        this._save()
    }

    _save() {
        localStorage.setItem('world', JSON.stringify({
            vertices: this.vertices,
            edges: this.edges
        }));
    }
}