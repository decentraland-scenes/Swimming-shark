
// Create path curve

// how many points on the curve
let curvePoints = 25

// Define the points through which the path must pass
const cpoint1 = new Vector3(6.4, 3.2, 4.2)
const cpoint2 = new Vector3(12.8, 8, 3.2)
const cpoint3 = new Vector3(12.8, 7, 12.8)
const cpoint4 = new Vector3(3.2, 3.2, 11.2)

// Compile these points into an array
const cpoints = [cpoint1, cpoint2, cpoint3, cpoint4]

// Create a Catmull-Rom Spline curve. It that passes through all 4 points. The total number of points in the path is set by  `curvePoints`
let catmullPath = Curve3.CreateCatmullRomSpline(cpoints, curvePoints, true).getPoints()

// Custom component to store path and lerp data
@Component("pathData")
export class PathData {
  origin: number = 0
  target: number = 1
  path: Vector3[] = catmullPath
  fraction: number = 0
  constructor(path: Vector3[]){
    this.path = path
  }
}

// component group of all sharks
export const sharks = engine.getComponentGroup(PathData)

// Custom component to store rotational lerp data
@Component("rotateData")
export class RotateData {
  originRot: Quaternion
  targetRot: Quaternion
  fraction: number = 0
}

// Custom component to store current speed
@Component("swimSpeed")
export class SwimSpeed {
  speed: number = 0.5
}


// Lerp over the points of the curve
export class PatrolPath {
  update() {
    for (let shark of sharks.entities){
      let transform = shark.getComponent(Transform)
      let path = shark.getComponent(PathData)
      let speed = shark.getComponent(SwimSpeed)
      transform.position = Vector3.Lerp(
        path.path[path.origin],
        path.path[path.target],
        path.fraction
        )
      path.fraction += speed.speed/10
      if (path.fraction > 1) {
        path.origin = path.target
        path.target += 1
        if (path.target >= path.path.length-1) {
          path.target = 0
        }
        path.fraction = 0      
      }
     
    }
  }
}

engine.addSystem(new PatrolPath(), 2)

// Change speed depending on how steep is the shark's path
export class UpdateSpeed {
  update() {
    for (let shark of sharks.entities){
      let speed = shark.getComponent(SwimSpeed)
      let path = shark.getComponent(PathData)
    
      let depthDiff = (path.path[path.target].y - path.path[path.origin].y) * curvePoints
      if (depthDiff > 1){
        depthDiff = 1
      } else if (depthDiff < -1){
        depthDiff = -1
      }
      depthDiff += 1.5   // from 0.5 to 2.5
    
      let clipSwim = shark.getComponent(Animator).getClip("swim")
      clipSwim.speed = depthDiff
      clipSwim.weight = depthDiff
      
      speed.speed = ((depthDiff * -1) + 3) // from 2.5 to 0.5
      //log("dd :" , depthDiff, " speed: " , speed.speed)
    }
  }
}

engine.addSystem(new UpdateSpeed(), 1)

// Rotate gradually with a spherical lerp
export class RotateSystem {
  update(dt: number) {
    for (let shark of sharks.entities){
      let transform = shark.getComponent(Transform)
      let path = shark.getComponent(PathData)
      let rotate = shark.getComponent(RotateData)
      let speed = shark.getComponent(SwimSpeed)
      rotate.fraction +=  speed.speed/10

      if (rotate.fraction > 1) {
        rotate.fraction = 0
        rotate.originRot = transform.rotation
        let direction = path.path[path.target].subtract(path.path[path.origin]).normalize()
        rotate.targetRot = Quaternion.LookRotation(direction)
      }  
      transform.rotation = Quaternion.Slerp(
        rotate.originRot,
        rotate.targetRot,
        rotate.fraction
      )
    }
  }
}

engine.addSystem(new RotateSystem(), 3)




// Add Shark model
let shark = new Entity()
shark.addComponent(new Transform({
  position: new Vector3(1, 0, 1),
  scale: new Vector3(0.5, 0.5, 0.5)
}))
shark.addComponent(new GLTFShape("models/shark.gltf"))
shark.addComponent(new Animator())

// Add animations
const clipSwim3 = new AnimationClip("swim")
clipSwim3.speed = 0.5
clipSwim3.weight = 0.5
shark.getComponent(Animator).addClip(clipSwim3)

// Activate swim animation
clipSwim3.play()

// add a path data component
shark.addComponent(new PathData(catmullPath))
shark.addComponent(new RotateData())
shark.addComponent(new SwimSpeed())

// Add shark to engine
engine.addEntity(shark)


// Add 3D model for scenery
const seaBed = new Entity()
seaBed.addComponent(new GLTFShape("models/Underwater.gltf"))
seaBed.addComponent(new Transform({
  position: new Vector3(8, 0, 8),
  rotation: Quaternion.Euler(0, 270, 0),
  scale: new Vector3(0.8, 0.8, 0.8)

}))
engine.addEntity(seaBed)