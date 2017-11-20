//TODO: add faces and shading, pre-processing auto intersection correction, the drawing stack, objects

//TODO DAY 2: movement acceleration, max draw distance, x-y-z coordinate lines, horizon gradient

'use strict'

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const world = new LocalWorld()
const input = new Input(canvas)
input.tryMouseLock(true)

const projectedPoints = new Map()

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

const style = {
    point: {
        radius: 60,
        color: 'rgba(50,20,75,1)'
    },
    link: {
        width: 1,
        color: 'rgba(255,155,0,1)'
    }
}

const centermostPoint = {
    id: null,
    distToCrosshair: Infinity
}
const selection = {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 }
}
let copyPoints = new Map()
let copyOrigin = null

let dragPointId = null
let pointPlaceDistance = 5
let movementSpeed = 0.06
let gridOn = false
let gridScale = 0.25

function engineLoop() 
{
    handleControls()
    input.frameReset()

    projectedPoints.clear()
    drawWorld()
    drawUI()

    centermostPoint.distToCrosshair = Infinity
    requestAnimationFrame(engineLoop)
}

document.addEventListener('pointerlockchange', e => {
    if (!input.mouse.locked)
        input.tryMouseLock(false)
})

function handleControls() 
{
    const aimingPoint = getAimingPoint()

    if (input.mouse.locked) {
        if (input.buttonPressed('right')) {
            if (projectedPoints.get(centermostPoint.id).distToCam < 10) {
                dragPointId = centermostPoint.id
            }
        }
        if (input.buttonPressed('middle')) {
            world.deletePoint(centermostPoint.id)
        }
        if (input.buttonPressed('left')) {
            world.placePoint(aimingPoint)
        }
        if (input.buttonReleased('right')) {
            if (dragPointId !== null && projectedPoints.get(centermostPoint.id).distToCam < 10) {
                world.connectPoints([dragPointId, centermostPoint.id])
            } 
            dragPointId = null;
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
        if (input.keyPressed(' ')) {
            input.tryMouseLock(true)
        }
    }

    if (input.keyDown('control')) {
        
        if (input.keyPressed('c') || input.keyPressed('x')) {
            copyPoints.clear()
            ctx.rect(selection.start.x, selection.start.y, selection.end.x - selection.start.x, selection.end.y - selection.start.y)
            projectedPoints.forEach((p, id) => {
                if (ctx.isPointInPath(p.x, p.y)) {
                    const newPoint = Object.assign({}, world.points.get(id))
                    newPoint.links = new Set(newPoint.links)
                    copyPoints.set(id, newPoint)
                }
            })
            copyOrigin = aimingPoint

            if (input.keyPressed('x')) {
                world.deletePoint([...copyPoints.keys()])
            }

        } else if (input.keyPressed('v')) {
            world.integrateOtherWorld(copyPoints)
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
}

function drawWorld()
{
    ctx.clearRect(0,0, canvas.width, canvas.height)

    world.points.forEach((p, id) => {
        p.links.forEach(oid => {
            if (id > oid)
                drawLineBetweenPoints(p, world.points.get(oid))

        })
        const projectedP = drawPoint(p)
        if (projectedP) {
            const distToCrosshair = distBetPoints(projectedP.x, projectedP.y, 0, canvas.width/2, canvas.height/2, 0)
            if (distToCrosshair < centermostPoint.distToCrosshair && projectedP.radius > 2) {
                centermostPoint.id = id
                centermostPoint.distToCrosshair = distToCrosshair
            }
            projectedPoints.set(id, projectedP)
        }

        if (gridOn) {
            drawGrid({
                x: roundToNearest(p.x, gridScale),
                y: roundToNearest(p.y, gridScale),
                z: roundToNearest(p.z, gridScale)
            }, gridScale*2, gridScale)
        }
    })
}

const selectorCircle = {
    x:canvas.width/2,
    y:canvas.height/2,
    radius: 100,
    opacity: 1
}

function drawUI()
{
    const projectedCenterPoint = projectedPoints.get(centermostPoint.id);
    //interpolate selector-snap circle
    if (projectedCenterPoint && centermostPoint.distToCrosshair < 100 && projectedCenterPoint.distToCam < 10) {
        //draw increased size point
        ctx.beginPath()
        ctx.arc(projectedCenterPoint.x, projectedCenterPoint.y, projectedCenterPoint.radius+10, 0, Math.PI*2, true)
        ctx.fill()

        selectorCircle.x -= (selectorCircle.x - projectedCenterPoint.x) * 0.2
        selectorCircle.y -= (selectorCircle.y - projectedCenterPoint.y) * 0.2
        selectorCircle.radius -= (selectorCircle.radius - (projectedCenterPoint.radius + 13)) * 0.1
        selectorCircle.opacity -= (selectorCircle.opacity - 1) * 0.1
    } else {
        selectorCircle.x -= (selectorCircle.x - canvas.width/2) * 0.1
        selectorCircle.y -= (selectorCircle.y - canvas.height/2) * 0.1
        selectorCircle.radius -= (selectorCircle.radius - 100) * 0.1
        selectorCircle.opacity -= (selectorCircle.opacity - 0.1) * 0.1
    }

    //draw connector for aimingPoint
    const aimingPoint = getAimingPoint()

    const dragPoint = world.points.get(dragPointId)
    if (dragPoint) {
        if (centermostPoint.distToCrosshair < 100 && projectedCenterPoint.distToCam < 10) {
            drawLineBetweenPoints(dragPoint, world.points.get(centermostPoint.id))
        } else {
            drawLineBetweenPoints(dragPoint, aimingPoint)
        }
    }

    //draw selector-snap circle
    ctx.beginPath()
    ctx.globalAlpha = selectorCircle.opacity
    ctx.arc(selectorCircle.x,selectorCircle.y,selectorCircle.radius,0,2*Math.PI)
    ctx.stroke()
    ctx.globalAlpha = 1

    //draw reticle
    var pointRadius = style.point.radius/pointPlaceDistance/2

    ctx.beginPath()
    ctx.moveTo(canvas.width/2-pointRadius,canvas.height/2)
    ctx.lineTo(canvas.width/2+pointRadius,canvas.height/2)
    ctx.moveTo(canvas.width/2,canvas.height/2-pointRadius)
    ctx.lineTo(canvas.width/2,canvas.height/2+pointRadius)
    ctx.stroke()

    //draw reticle grid
    if (gridOn) {
        drawGrid(aimingPoint, gridScale*2, gridScale)
    }

    //draw placement distance text
    ctx.strokeText(pointPlaceDistance.toPrecision(3), canvas.width/2+3, canvas.height/2-3)

    //draw gridscale text
    if (input.keyDown('shift')) {
        ctx.strokeText(gridScale.toPrecision(5), canvas.width/2+3, canvas.height/2+9)
    }

    //draw selection box
    ctx.setLineDash([10, 10])
    ctx.rect(selection.start.x, selection.start.y, selection.end.x - selection.start.x, selection.end.y - selection.start.y)
    ctx.stroke()
    ctx.setLineDash([])

    projectedPoints.forEach(p => {
        if (ctx.isPointInPath(p.x, p.y)) {
            ctx.fillRect(p.x, p.y, 15, 15)
        }
    })
}


function roundToNearest(numToRound, numToRoundTo) {
    numToRoundTo = 1 / (numToRoundTo)
    return Math.round(numToRound * numToRoundTo) / numToRoundTo
}

engineLoop()