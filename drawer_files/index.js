//TODO: add faces and shading, pre-processing auto intersection correction, the drawing stack, objects

//TODO DAY 2: movement acceleration, max draw distance, x-y-z coordinate lines, horizon gradient

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const world = new SocketWorld()
const input = new Input(canvas)
input.tryMouseLock(false)

const projectedVertices = []

const camera = {
    horizontalZoom: 500,	//artificial zooms
    verticalZoom: 500,
    offset: {
        x: canvas.width/2,
        y: canvas.height/2
    },
    position: {
        x:0,
        y:0,
        z:10
    },
    rot: {
        x: 0,
        y: Math.PI
    }
}

const config = {
    vertex_radius: 60,
    edge_width: 1,
    vertex_color: "rgba(255,155,0,1)",
    edge_color: "rgba(50,20,75,1)"
}

const centermostVertex = {
    index: null,
    distToCenter: 1000000,
    pointRadius: null,
    x: null,
    y: null //ADD: 3d distance to camera
}
const selectorCircle = {
    x:canvas.width/2,
    y:canvas.height/2,
    radius: 100,
    opacity: 1
}
const selection = {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 }
}
let copyPoints = []
let copyEdges = []

let dragVertex = null
let pointPlaceDistance = 5
let movementSpeed = 0.06
let gridOn = false
let gridScale = 0.25

function engineLoop() 
{
    handleControls()
    drawWorld()
    drawUI()

    centermostVertex.distToCenter = 1000000
    requestAnimationFrame(engineLoop)
}
engineLoop()

function handleControls() 
{
    const cx = pointPlaceDistance * Math.sin(camera.rot.y+Math.PI) * Math.sin(Math.PI*2/4+camera.rot.x)
    const cy = pointPlaceDistance * Math.cos(Math.PI*2/4+camera.rot.x)
    const cz = pointPlaceDistance * Math.cos(camera.rot.y+Math.PI) * Math.sin(Math.PI*2/4+camera.rot.x)
    let aimingPoint

    if (gridOn) {
        aimingPoint = {
            x: roundToNearest(camera.position.x+cx, gridScale),
            y: roundToNearest(-camera.position.y+cy, gridScale),
            z: roundToNearest(camera.position.z+cz, gridScale)
        }
    } else {
        aimingPoint = {
            x: camera.position.x+cx, gridScale,
            y: -camera.position.y+cy, gridScale,
            z: camera.position.z+cz, gridScale
        }
    }

    if (input.mouse.locked) {
        if (input.buttonPressed('right')) {
            if (centermostVertex.pointRadius > 2) {
                dragVertex = centermostVertex.index
            }
        }
        if (input.buttonPressed('middle')) {
            world.deletePoint(centermostVertex.index)
        }
        if (input.buttonPressed('left')) {
            world.placePoint(aimingPoint)
        }
        if (input.buttonReleased('right')) {
            if (dragVertex && centermostVertex.pointRadius > 2) {
                world.connectPoints([dragVertex, centermostVertex.index])
            } 
            dragVertex = null;
        }

        camera.rot.x -= input.mouse.move.y/300
        camera.rot.y -= input.mouse.move.x/300

    } else {
        if (input.buttonPressed('left')) {
            selection.start = { x: input.mouse.x, y: input.mouse.y }
            selection.end = { x: input.mouse.x, y: input.mouse.y }
        } else if (input.buttonDown('left')) {
            selection.end = { x: input.mouse.x, y: input.mouse.y }
        }

        ctx.rect(selection.start.x, selection.start.y, selection.end.x - selection.start.x, selection.end.y - selection.start.y)
        const selectedPoints = projectedVertices.filter(v => ctx.isPointInPath(v.x, v.y))

        if (input.keyDown('control') && input.keyPressed('c')) {
            copyPoints = selectedPoints.map(p => ({ 
                relx: world.vertices[p.index].x - aimingPoint.x,
                rely: world.vertices[p.index].y - aimingPoint.y,
                relz: world.vertices[p.index].z - aimingPoint.z,
                index: p.index
            }))
            copyEdges = []
            world.edges.forEach(e => {
                let a1, a2
                copyPoints.every((p, i) => {
                    if (p.index === e[0])
                        a1 = i
                    if (p.index === e[1])
                        a2 = i
                    if (a1 && a2)
                        return false
                    return true
                })
                if (a1 !== undefined && a2 !== undefined)
                    copyEdges.push([a1, a2])
            })
        } else if (input.keyDown('control') && input.keyPressed('v')) {
            world.addSubGraph({
                points: copyPoints.map(p => ({
                    x: p.relx + aimingPoint.x,
                    y: p.rely + aimingPoint.y,
                    z: p.relz + aimingPoint.z
                })),
                edges: copyEdges
            })
        }
    }

    if (camera.rot.x > Math.PI/2) {
        camera.rot.x = Math.PI/2
    } else if (camera.rot.x < -Math.PI/2) {
        camera.rot.x = -Math.PI/2
    }

    //keyboard input
    var sinTheta = Math.sin(camera.rot.y)
	var cosTheta = Math.cos(camera.rot.y)
    
    if (input.keyDown('shift')) {
        if (input.keyDown('up') || input.keyDown('w')) {
            camera.position.z -= movementSpeed
        }
        if (input.keyDown('down') || input.keyDown('s')) {
            camera.position.z += movementSpeed
        }
        if (input.keyDown('left') || input.keyDown('a')) {
            camera.position.x += movementSpeed
        }
        if (input.keyDown('right') || input.keyDown('d')) {
            camera.position.x -= movementSpeed
        }
        if (input.scroll > 0) {
            gridScale *= 2
        } else if (input.scroll < 0) {
            gridScale *= 0.5
        }
    } else {
        if (input.keyDown('up') || input.keyDown('w')) {
            camera.position.x -= sinTheta * movementSpeed
            camera.position.z -= cosTheta * movementSpeed
        }
        if (input.keyDown('down') || input.keyDown('s')) {
            camera.position.x += sinTheta * movementSpeed
            camera.position.z += cosTheta * movementSpeed
        }
        if (input.keyDown('left') || input.keyDown('a')) {
            camera.position.z += sinTheta * movementSpeed
            camera.position.x -= cosTheta * movementSpeed
        }
        if (input.keyDown('right') || input.keyDown('d')) {
            camera.position.z -= sinTheta * movementSpeed
            camera.position.x += cosTheta * movementSpeed
        }
        if (gridOn) {
            pointPlaceDistance += input.scroll * gridScale
        } else {
            pointPlaceDistance += input.scroll / 10
        }
    }

    if (input.keyPressed('g')) {
        gridOn = !gridOn
    }
	
	if (input.keyDown('e')) {
        camera.position.y += movementSpeed
    }
    if (input.keyDown('q')) {
        camera.position.y -= movementSpeed
    }

    camera.horizontalZoom = Math.max(500, pointPlaceDistance * 50)	//artificial zooms
    camera.verticalZoom = Math.max(500, pointPlaceDistance * 50)

    input.frameReset()
}

function drawWorld() 
{
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    ctx.strokeStyle = config.edge_color
    ctx.lineWidth = config.edge_width
    for (var j = 0; j < world.edges.length; j++) {
        var edge_start = world.vertices[world.edges[j][0]]
        var edge_end = world.vertices[world.edges[j][1]]
        drawLineBetweenPoints(edge_start, edge_end)
    }

    ctx.fillStyle = config.vertex_color;
    for (var i = 0; i < world.vertices.length; i++) {
        drawPoint(world.vertices[i], i)
        //draw reticle grid
        if (gridOn) {
            var base = {
                x: roundToNearest(world.vertices[i].x, gridScale),
                y: roundToNearest(world.vertices[i].y, gridScale),
                z: roundToNearest(world.vertices[i].z, gridScale)
            }
            drawGrid(base, gridScale*2, gridScale)
        }
    }
}

function drawUI()
{
    var circleRadius = 100

    //interpolate selector-snap circle
    if (centermostVertex.distToCenter < 100 && centermostVertex.pointRadius > 2) {
        //draw increased size vertex
        ctx.beginPath()
        ctx.arc(centermostVertex.x, centermostVertex.y, centermostVertex.pointRadius+10, 0, Math.PI*2, true)
        ctx.fill()

        selectorCircle.x -= (selectorCircle.x - centermostVertex.x) * 0.2
        selectorCircle.y -= (selectorCircle.y - centermostVertex.y) * 0.2
        selectorCircle.radius -= (selectorCircle.radius - (centermostVertex.pointRadius + 13)) * 0.1
        selectorCircle.opacity -= (selectorCircle.opacity - 1) * 0.1
    } else {
        selectorCircle.x -= (selectorCircle.x - canvas.width/2) * 0.1
        selectorCircle.y -= (selectorCircle.y - canvas.height/2) * 0.1
        selectorCircle.radius -= (selectorCircle.radius - 100) * 0.1
        selectorCircle.opacity -= (selectorCircle.opacity - 0.1) * 0.1
    }

    //draw connector for dragVertex
    var cx = pointPlaceDistance * Math.sin(camera.rot.y+Math.PI) * Math.sin(Math.PI*2/4+camera.rot.x)
    var cy = pointPlaceDistance * Math.cos(Math.PI*2/4+camera.rot.x)
    var cz = pointPlaceDistance * Math.cos(camera.rot.y+Math.PI) * Math.sin(Math.PI*2/4+camera.rot.x)

    var newPoint
    if (gridOn) {
        newPoint = {
            x: roundToNearest(camera.position.x+cx, gridScale),
            y: roundToNearest(-camera.position.y+cy, gridScale),
            z: roundToNearest(camera.position.z+cz, gridScale)
        }
    } else {
        newPoint = {
            x: camera.position.x+cx, gridScale,
            y: -camera.position.y+cy, gridScale,
            z: camera.position.z+cz, gridScale
        }
    }

    if (dragVertex) {
        if (centermostVertex.distToCenter < 100 && centermostVertex.pointRadius > 2) {
            drawLineBetweenPoints(world.vertices[dragVertex], world.vertices[centermostVertex.index])
        } else {
            drawLineBetweenPoints(world.vertices[dragVertex], newPoint)
        }
    }

    //draw selector-snap circle
    ctx.beginPath()
    ctx.globalAlpha = selectorCircle.opacity
    ctx.arc(selectorCircle.x,selectorCircle.y,selectorCircle.radius,0,2*Math.PI)
    ctx.stroke()
    ctx.globalAlpha = 1

    //draw reticle
    var pointRadius = config.vertex_radius/pointPlaceDistance/2

    ctx.beginPath()
    ctx.moveTo(canvas.width/2-pointRadius,canvas.height/2)
    ctx.lineTo(canvas.width/2+pointRadius,canvas.height/2)
    ctx.moveTo(canvas.width/2,canvas.height/2-pointRadius)
    ctx.lineTo(canvas.width/2,canvas.height/2+pointRadius)
    ctx.stroke()

    //draw reticle grid
    if (gridOn) {
        drawGrid(newPoint, gridScale*2, gridScale)
    }

    ctx.strokeStyle = config.edge_color
    ctx.lineWidth = config.edge_width
    //draw placement distance text
    ctx.strokeText(pointPlaceDistance.toPrecision(3), canvas.width/2+3, canvas.height/2-3)

    //draw gridscale text
    if (input.keyDown('shift')) {
        ctx.strokeStyle = 'red'
        ctx.strokeText(gridScale.toPrecision(5), canvas.width/2+3, canvas.height/2+9)
    }

    //draw selection box
    ctx.setLineDash([10, 10])
    ctx.rect(selection.start.x, selection.start.y, selection.end.x - selection.start.x, selection.end.y - selection.start.y)
    ctx.stroke()
    ctx.setLineDash([])

    projectedVertices.forEach((v, i) => {
        if (ctx.isPointInPath(v.x, v.y)) {
            ctx.fillStyle = 'red'
            ctx.fillRect(v.x, v.y, 5, 5)
        }
    })
}

function drawGrid(point, gridSize, gridScale) {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.1;
    var zeroCorner = { 
        x: point.x - gridSize/2,
        y: point.y - gridSize/2,
        z: point.z - gridSize/2
    }
    for (var i = 0; i < gridSize+gridScale; i+=gridScale) {
        for (var k = 0; k < gridSize+gridScale; k+=gridScale) {
            drawLineBetweenPoints(
                { x: zeroCorner.x+i, y: zeroCorner.y, z: zeroCorner.z+k }, 
                { x: zeroCorner.x+i, y: zeroCorner.y+gridSize, z: zeroCorner.z+k }
            )
        }
        for (var k = 0; k < gridSize+gridScale; k+=gridScale) {
            drawLineBetweenPoints(
                { x: zeroCorner.x, y: zeroCorner.y+k, z: zeroCorner.z+i }, 
                { x: zeroCorner.x+gridSize, y: zeroCorner.y+k, z: zeroCorner.z+i }
            )
        }
        for (var k = 0; k < gridSize+gridScale; k+=gridScale) {
            drawLineBetweenPoints(
                { x: zeroCorner.x+i, y: zeroCorner.y+k, z: zeroCorner.z }, 
                { x: zeroCorner.x+i, y: zeroCorner.y+k, z: zeroCorner.z+gridSize }
            )
        }
    }
}

function drawPoint(point, i) {
    point = rotatePoint3d(camera.rot.y, camera.rot.x, point, camera.position)
    
    var point_dist_cam = distToCamPlane(point)
    
    var projection_x = (point.x - camera.position.x) * camera.horizontalZoom / point_dist_cam + camera.offset.x
    var projection_y = (point.y  +camera.position.y) * camera.verticalZoom / point_dist_cam + camera.offset.y
    
    if (point_dist_cam > 0) {
         
        ctx.beginPath()
        ctx.arc(projection_x, projection_y, config.vertex_radius/point_dist_cam/2, 0, Math.PI*2, true)
        ctx.fill()
        
        if (i !== undefined) {
            var curVertexDist = distBetPoints(projection_x,projection_y,0,canvas.width/2,canvas.height/2,0)
            if (curVertexDist < centermostVertex.distToCenter && config.vertex_radius/point_dist_cam/2 > 2) {
                centermostVertex.x = projection_x
                centermostVertex.y = projection_y
                centermostVertex.distToCenter = curVertexDist
                centermostVertex.index = i
                centermostVertex.pointRadius = config.vertex_radius/point_dist_cam/2
            }

            projectedVertices[i] = { 
                x: projection_x, 
                y: projection_y, 
                pointRadius: config.vertex_radius/point_dist_cam/2,
                index: i
            }
        }
    }
}

function drawLineBetweenPoints(edge_start, edge_end) {
    edge_start = rotatePoint3d(camera.rot.y, camera.rot.x, edge_start, camera.position)
    
    edge_end = rotatePoint3d(camera.rot.y, camera.rot.x, edge_end, camera.position)
    
    var start_dist_cam = distToCamPlane(edge_start)
    var end_dist_cam = distToCamPlane(edge_end)
    if (end_dist_cam > start_dist_cam) {
        var temp = end_dist_cam
        end_dist_cam = start_dist_cam
        start_dist_cam = temp
        
        temp = edge_end
        edge_end = edge_start
        edge_start = temp
    }
    
    if (start_dist_cam > 0) {
        if (end_dist_cam < 0) {	//this is not perfect at all. lines sometimes dont go all the way to the camera plane i think
            
            var dir_vector = {
                x: edge_end.x-edge_start.x,
                y: edge_end.y-edge_start.y,
                z: edge_end.z-edge_start.z
            }	//the directional vector for the line to draw
            
            coef = (camera.position.z - edge_start.z) / dir_vector.z - 0.01; //cut off 0.01 units in front of camera plane
            
            edge_end = {
                x: edge_start.x + coef*dir_vector.x,
                y: edge_start.y + coef*dir_vector.y,
                z: edge_start.z + coef*dir_vector.z
            }    
        }
        
        end_dist_cam = distToCamPlane(edge_end)
        
        var projection_start_x = (edge_start.x - camera.position.x) * camera.horizontalZoom / Math.abs(start_dist_cam) + camera.offset.x
        var projection_start_y = (edge_start.y + camera.position.y) * camera.verticalZoom / Math.abs(start_dist_cam) + camera.offset.y
        
        var projection_end_x = (edge_end.x - camera.position.x) * camera.horizontalZoom / Math.abs(end_dist_cam) + camera.offset.x
        var projection_end_y = (edge_end.y + camera.position.y) * camera.verticalZoom / Math.abs(end_dist_cam) + camera.offset.y

        ctx.beginPath()
        ctx.moveTo(projection_start_x, projection_start_y)
        ctx.lineTo(projection_end_x, projection_end_y)
        ctx.closePath()
        ctx.stroke()
    }
}

//rotates vec1 by theta (yaw), and phi (pitch) about vec2.
function rotatePoint3d(θ, φ, vec1, vec2) {
    return rotatePointX(
        φ, 
        rotatePointY(θ, vec1, vec2), 
        { x: vec2.x, y: -vec2.y, z: vec2.z }
    )
}

//rotates vec1 by theta about vec2 in the Y plane
function rotatePointY(theta, vec1, vec2) {
	var x0 = vec2.x || 0
	var y0 = vec2.y || 0
	var z0 = vec2.z || 0
	
	var sinTheta = Math.sin(theta)
	var cosTheta = Math.cos(theta)
	
	var x = vec1.x - x0
    var z = vec1.z - z0
    
	return {
		x: x*cosTheta-z*sinTheta + x0,
		y: vec1.y,
		z: z*cosTheta+x*sinTheta + z0
    }
}

function rotatePointX(theta, vec1, vec2) {
	var x0 = vec2.x || 0
	var y0 = vec2.y || 0
	var z0 = vec2.z || 0
	
	var sinTheta = Math.sin(theta);
	var cosTheta = Math.cos(theta);
	
	var y = vec1.y - y0;
    var z = vec1.z - z0;
    
	return {
		x:vec1.x,
		y: y*cosTheta-z*sinTheta + y0,
		z: z*cosTheta+y*sinTheta + z0
    }
}

function rotatePointZ(theta, vec1, vec2) {
	var x0 = vec2.x || 0
	var y0 = vec2.y || 0
	var z0 = vec2.z || 0
	
	var sinTheta = Math.sin(theta)
	var cosTheta = Math.cos(theta)
	
	var x = vec1.x - x0
    var y = vec1.y - y0

	return {
		x: x*cosTheta-y*sinTheta + x0,
		y: y*cosTheta+x*sinTheta + y0,
		z: vec1.z
    }
}

function distToCamPlane(point){
	var xthing = point.x - camera.position.x
	var ything = point.y - camera.position.y
	var zthing = point.z - camera.position.z
	
	var normal = [0,0,1]
	
	xthing = normal[0] * xthing
	ything = normal[1] * ything
	zthing = normal[2] * zthing
	
	if (xthing + ything + zthing > 0) {
		return -distBetPoints(xthing, ything, zthing)
	} else {
		return distBetPoints(xthing, ything, zthing)
	}
}

function distBetPoints(x1,y1,z1,x2,y2,z2) {
	var x2 = x2 || 0
	var y2 = y2 || 0
	var z2 = z2 || 0
	return Math.sqrt(
		(x1-x2)*(x1-x2) +
		(y1-y2)*(y1-y2) +
		(z1-z2)*(z1-z2)
	)
}

function roundToNearest(numToRound, numToRoundTo) {
    numToRoundTo = 1 / (numToRoundTo)
    return Math.round(numToRound * numToRoundTo) / numToRoundTo
}