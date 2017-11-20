class SocketWorld 
{
    constructor() 
    {
        this.points = []

        this._socket = new WebSocket(document.getElementById('data-port').innerHTML)

        this._socket.addEventListener('open', event => {
            console.log('socket connected')
        })
        
        this._socket.addEventListener('message', event => {
            const { points } = JSON.parse(event.data)
            this.points = points
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
}

class LocalWorld 
{
    constructor() 
    {
        this.points = new Map()

        this._idCounter = 0

        const storedData = JSON.parse(localStorage.getItem("world"), (k, v) => (k === 'links') ? new Set(v) : v)
        if (storedData) {
            this.points = new Map(storedData.points)
            this._idCounter = storedData._idCounter
        }
    }

    placePoint(point) 
    {
        if (Array.isArray(point)) {
            point.forEach(p => {
                this.points.set(this._idCounter, p)
                if (!point.links)
                    point.links = new Set()
                this._idCounter++
            })
        } else {
            this.points.set(this._idCounter, point)
            if (!point.links)
                point.links = new Set()
            this._idCounter++
        }
        
        this._save()
    }

    connectPoints(edge) 
    {
        if (Array.isArray(edge[0])) {
            edge.forEach(e => {
                this.points.get(e[0]).links.add(e[1])
                this.points.get(e[1]).links.add(e[0])
            })
        } else {
            this.points.get(edge[0]).links.add(edge[1])
            this.points.get(edge[1]).links.add(edge[0])
        }
        this._save()
    }

    deletePoint(pointId) 
    {
        console.log('deleting', pointId)
        if (Array.isArray(pointId)) {
            pointId.forEach(id => {
                this.points.get(id).links.forEach(oid => this.points.get(oid).links.delete(id))
                this.points.delete(id)
            })
        } else {
            this.points.get(pointId).links.forEach(oid => this.points.get(oid).links.delete(pointId))
            this.points.delete(pointId)
        }
        this._save()
    }

    integrateOtherWorld(points, newOrigin={x:0,y:0,z:0}) 
    {
        const newIds = new Map()

        points.forEach((p, id) => {
            newIds.set(id, this._idCounter)
            this._idCounter++
        })
        points.forEach((p, id) => {
            const newLinks = new Set()
            p.links.forEach(l => {
                const newId = newIds.get(l)
                if (newId) newLinks.add(newId)
            })
            this.points.set(newIds.get(id), p)
        })
        this._save()
    }

    _save() {
        localStorage.setItem(
            'world', 
            JSON.stringify(
                { 
                    points: [...this.points],
                    _idCounter: this._idCounter 
                }, 
                (k,v) =>  (k === 'links') ? [...v] : v
            )
        )
    }
}