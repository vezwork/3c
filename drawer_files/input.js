class Input {
    constructor(el=document.body, mobile) {
        if (!((el instanceof HTMLElement) || (el instanceof HTMLDocument)))
            throw new TypeError("ParameterError: el must be a valid HTML element!")
        
        this._el = el
        //allow this element to be focused
        if (el.tabIndex==-1)
            el.tabIndex = 1
        //input state
        this.keysDown = {}
        this.keysPressed = {}
        this.keysReleased = {}
        this.buttonsDown = {}
        this.buttonsPressed = {}
        this.buttonsReleased = {}
        this.mouse = { 
            x: 0,
            y: 0,
            move: {
                x: 0,
                y: 0
            },
            locked: false
        }
        this.scroll = 0
        this._tryToLockMouse = false

        this.frameReset()
        
        this.tilt = { abs: false, z:0, x:0, y:0 }
        
        this.touches = {}

        //mouse and keybaord
        //disable the context menu
        el.addEventListener('contextmenu', e=>e.preventDefault())
        //add callbacks
        const mouseWheelHandler = e => {
            this.scroll += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)))
        }
        el.addEventListener("mousewheel", mouseWheelHandler)
        el.addEventListener("DOMMouseScroll", mouseWheelHandler)
        el.addEventListener('mousedown', e=>{
            e.preventDefault()
            if (this._tryToLockMouse)
                this._el.requestPointerLock()

            this._el.focus()
            this.buttonsDown[e.button] = true
            this.buttonsPressed[e.button] = true
        })
        el.addEventListener('mouseup', e=>{
            e.preventDefault()
            this.buttonsDown[e.button] = false
            this.buttonsReleased[e.button] = true
        })
        el.addEventListener('mousemove', e=>{
            const {left, top} = this._el.getBoundingClientRect()
            this.mouse.x = e.clientX - left
            this.mouse.y = e.clientY - top

            this.mouse.move.x += e.movementX
            this.mouse.move.y += e.movementY
        })
        document.addEventListener('pointerlockchange', e=>{
            this.mouse.locked = document.pointerLockElement === el
        })
        el.addEventListener('keydown', e=>{
            e.preventDefault()
            if (!this.keysDown[e.key.toLowerCase()]) {
                this.keysPressed[e.key.toLowerCase()] = true
                this.keysDown[e.key.toLowerCase()] = true
            }
        })
        el.addEventListener('keyup', e=>{
            this.keysReleased[e.key.toLowerCase()] = true
            e.preventDefault()
            this.keysDown[e.key.toLowerCase()] = false
        })
        if (mobile) {
            //tilt
            window.addEventListener('deviceorientation', e=>{
                this.tilt = {
                    abs: e.absolute,
                    z: e.alpha,
                    x: e.beta,
                    y: e.gamma
                }
            })
            //touch
            el.addEventListener('touchstart', e=>{
                e.preventDefault()
                this._el.focus()
                this.touches = this._processTouches(e.touches)
            })
            
            el.addEventListener('touchmove', e=>{
                e.preventDefault()
                this.touches = this._processTouches(e.touches)
            })
            
            el.addEventListener('touchcancel', e=>{
                e.preventDefault()
                const touches = this._processTouches(e.changedTouches)
            })
            
            el.addEventListener('touchend', e=>{
                e.preventDefault()
                const touches = this._processTouches(e.changedTouches, true)
            })
        }
    }
    
    _processTouches(touches, del) {
        const formatted = {}
        for(let i = 0; i < touches.length; i++) {
            const {left, top} = this._el.getBoundingClientRect()
            if (del)
                delete this.touches[touches[i].identifier]
                
            formatted[touches[i].identifier] = {
                x: touches[i].clientX - left |0,
                y: touches[i].clientY - top |0
            }
        }
        return formatted
    }
    
    setCursor(...args) {
        this._el.style.cursor = args.reduce(
            (a,c)=> a + c + ', '
        , "")+"auto"
    }

    tryMouseLock(isLocked) {
        if (isLocked) {
            this._tryToLockMouse = true
        }
        else {
            this._tryToLockMouse = false
            document.exitPointerLock()
        }
            
    }

    keyDown(key) {
        return (this.keysDown[key.toLowerCase()])?true:false
    }
    
    buttonDown(button) {
        if (typeof button == 'string')
            button = this._stringToMouseCode(button)
        
        return (this.buttonsDown[button])?true:false
    }
    
    keyPressed(key) {
        return (this.keysPressed[key.toLowerCase()])?true:false
    }
    
    keyReleased(key) {
        return (this.keysReleased[key.toLowerCase()])?true:false
    }
    
    buttonPressed(button) {
        if (typeof button == 'string')
            button = this._stringToMouseCode(button)
        
        return (this.buttonsPressed[button])?true:false
    }
    
    buttonReleased(button) {
        if (typeof button == 'string')
            button = this._stringToMouseCode(button)
        
        return (this.buttonsReleased[button])?true:false
    }
    
    _stringToMouseCode(str) {
        switch (str.toLowerCase()) {
            case 'left': return 0
            case 'middle': return 1
            case 'right': return 2
            default: throw 'invalid mouse button'
        }
    }
    
    frameReset() {
        this.keysPressed = {}
        this.keysReleased = {}
        this.buttonsPressed = {}
        this.buttonsReleased = {}

        this.mouse.move.x = 0
        this.mouse.move.y = 0
        this.scroll = 0
    }
}