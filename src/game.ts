// Create path curve

// how many points on the curve
const curvePoints = 25

// Define the points through which the path must pass
const cpoint1 = new Vector3(6.4, 3.2, 4.2)
const cpoint2 = new Vector3(12.8, 8, 3.2)
const cpoint3 = new Vector3(12.8, 7, 12.8)
const cpoint4 = new Vector3(3.2, 3.2, 11.2)

// Compile these points into an array
const cpoints = [cpoint1, cpoint2, cpoint3, cpoint4]

// Create a Catmull-Rom Spline curve. This curve passes through all 4 points. The total number of points in the path is set by  `curvePoints`
const catmullPath = Curve3.CreateCatmullRomSpline(
  cpoints,
  curvePoints,
  true
).getPoints()

// Custom component to store path and lerp data
@Component('pathData')
export class PathData {
  origin: number = 0
  target: number = 1
  path: Vector3[] = catmullPath
  fraction: number = 0
  constructor(path: Vector3[]) {
    this.path = path
  }
}

// component group of all sharks (just one in this example, but could be extended)
export const sharks = engine.getComponentGroup(PathData)

// Custom component to store rotational lerp data
@Component('rotateData')
export class RotateData {
  originRot: Quaternion = Quaternion.Identity
  targetRot: Quaternion = Quaternion.Identity
  fraction: number = 0
}

// Custom component to store current speed
@Component('swimSpeed')
export class SwimSpeed {
  speed: number = 0.5
}

// Lerp over the points of the curve
export class PatrolPath {
  update() {
    for (const shark of sharks.entities) {
      const transform = shark.getComponent(Transform)
      const path = shark.getComponent(PathData)
      const speed = shark.getComponent(SwimSpeed)
      transform.position = Vector3.Lerp(
        path.path[path.origin],
        path.path[path.target],
        path.fraction
      )
      path.fraction += speed.speed / 10
      if (path.fraction > 1) {
        path.origin = path.target
        path.target += 1
        if (path.target >= path.path.length - 1) {
          path.target = 0
        }
        path.fraction = 0
      }
    }
  }
}

engine.addSystem(new PatrolPath(), 2)

// Change speed depending on how steep the current section of the shark's path is
export class UpdateSpeed {
  update() {
    for (const shark of sharks.entities) {
      const speed = shark.getComponent(SwimSpeed)
      const path = shark.getComponent(PathData)

      let depthDiff =
        (path.path[path.target].y - path.path[path.origin].y) * curvePoints
      if (depthDiff > 1) {
        depthDiff = 1
      } else if (depthDiff < -1) {
        depthDiff = -1
      }
      depthDiff += 1.5 // from 0.5 to 2.5

      const clipSwim = shark.getComponent(Animator).getClip('swim')
      clipSwim.speed = depthDiff
      clipSwim.weight = depthDiff

      speed.speed = depthDiff * -1 + 3 // from 2.5 to 0.5
      //log("dd :" , depthDiff, " speed: " , speed.speed)
    }
  }
}

engine.addSystem(new UpdateSpeed(), 1)

// Rotate gradually with a spherical lerp
export class RotateSystem {
  update(dt: number) {
    for (const shark of sharks.entities) {
      const transform = shark.getComponent(Transform)
      const path = shark.getComponent(PathData)
      const rotate = shark.getComponent(RotateData)
      const speed = shark.getComponent(SwimSpeed)
      rotate.fraction += speed.speed / 10

      if (rotate.fraction > 1) {
        rotate.fraction = 0
        rotate.originRot = transform.rotation
        const direction = path.path[path.target]
          .subtract(path.path[path.origin])
          .normalize()
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
const shark = new Entity()
shark.addComponent(
  new Transform({
    position: new Vector3(1, 0, 1),
    scale: new Vector3(0.5, 0.5, 0.5)
  })
)
shark.addComponent(new GLTFShape('models/shark.glb'))
shark.addComponent(new Animator())

// Add animations
const clipSwim3 = new AnimationState('swim')
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
seaBed.addComponent(new GLTFShape('models/Underwater.gltf'))
seaBed.addComponent(
  new Transform({
    position: new Vector3(8, 0, 8),
    rotation: Quaternion.Euler(0, 90, 0),
    scale: new Vector3(0.8, 0.8, 0.8)
  })
)

engine.addEntity(seaBed)

onCameraModeChanged.add(({ cameraMode }) => {
  log('onCameraModeChanged:', cameraMode)
  log('Current CameraMode:', Camera.instance.cameraMode)
})
//   CameraMode.FirstPerson
