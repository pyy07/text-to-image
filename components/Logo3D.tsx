'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

export default function Logo3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const textMeshRef = useRef<THREE.Group | null>(null)
  const letterMeshesRef = useRef<THREE.Mesh[]>([])
  const spotLightRef = useRef<THREE.SpotLight | null>(null)
  const raycasterRef = useRef<THREE.Raycaster | null>(null)
  const mouseRef = useRef<THREE.Vector2 | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const fontRef = useRef<any>(null)
  
  const isHoveringRef = useRef(false)
  const hoveredLetterIndexRef = useRef(-1)
  const hoveredLetterEffectRef = useRef<string | null>(null)

  const getRandomEffect = (): string => {
    const effects = [
      'pulse',
      'spin',
      'rainbow',
      'bounce',
      'flip',
      'glow',
      'wave',
      'zoom'
    ]
    return effects[Math.floor(Math.random() * effects.length)]
  }

  const getColorForIndex = (index: number): number => {
    const colors = [
      0x4a90e2, // 亮蓝色
      0x7b68ee, // 亮紫色
      0xff6b9d, // 亮粉色
      0x4a90e2,
      0x7b68ee,
      0xff6b9d,
      0x4a90e2,
      0x7b68ee,
      0xff6b9d
    ]
    return colors[index % colors.length]
  }

  const onMouseMove = useCallback((event: MouseEvent) => {
    const container = containerRef.current
    if (!container || !letterMeshesRef.current || letterMeshesRef.current.length === 0 || !cameraRef.current) return

    const rect = container.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const normalizedX = (mouseX / rect.width) * 2 - 1
    const normalizedY = -((mouseY / rect.height) * 2 - 1)

    if (!raycasterRef.current) {
      raycasterRef.current = new THREE.Raycaster()
    }
    if (!mouseRef.current) {
      mouseRef.current = new THREE.Vector2()
    }

    mouseRef.current.set(normalizedX, normalizedY)
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
    const intersects = raycasterRef.current.intersectObjects(letterMeshesRef.current, true)

    if (intersects.length > 0) {
      const hoveredMesh = intersects[0].object as THREE.Mesh
      const newIndex = hoveredMesh.userData.index

      if (newIndex !== hoveredLetterIndexRef.current) {
        hoveredLetterIndexRef.current = newIndex
        hoveredLetterEffectRef.current = getRandomEffect()
      }
      isHoveringRef.current = true
    } else {
      hoveredLetterIndexRef.current = -1
      hoveredLetterEffectRef.current = null
      isHoveringRef.current = false
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    isHoveringRef.current = false
    hoveredLetterIndexRef.current = -1
    hoveredLetterEffectRef.current = null
  }, [])

  const addEventListeners = useCallback(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', onMouseMove)
      container.addEventListener('mouseleave', onMouseLeave)
    }
  }, [onMouseMove, onMouseLeave])

  const removeEventListeners = useCallback(() => {
    const container = containerRef.current
    if (container) {
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [onMouseMove, onMouseLeave])

  const onWindowResize = useCallback(() => {
    const container = containerRef.current
    if (!container || !cameraRef.current || !rendererRef.current) return

        const width = container.clientWidth
        const height = container.clientHeight

        const viewSize = 60
        cameraRef.current.left = -viewSize * (width / height)
    cameraRef.current.right = viewSize * (width / height)
    cameraRef.current.top = viewSize
    cameraRef.current.bottom = -viewSize
    cameraRef.current.updateProjectionMatrix()

    rendererRef.current.setSize(width, height)
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      const checkContainer = () => {
        if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
          loadFont()
        } else {
          setTimeout(checkContainer, 100)
        }
      }
      checkContainer()
    }
    
    window.addEventListener('resize', onWindowResize)
    
    return () => {
      removeEventListeners()
      window.removeEventListener('resize', onWindowResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
    }
  }, [onWindowResize, removeEventListeners])

  const loadFont = async () => {
    try {
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js')
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js')
      
      ;(window as any).__threeFontLoader = FontLoader
      ;(window as any).__threeTextGeometry = TextGeometry
      
      const loader = new FontLoader()
      loader.load(
        '/fonts/helvetiker_regular.typeface.json',
        (font) => {
          fontRef.current = font
          setTimeout(() => {
            initThree()
            animate()
            addEventListeners()
          }, 50)
        },
        undefined,
        (error) => {
          console.error('Logo3D: Font loading failed:', error)
        }
      )
    } catch (error) {
      console.error('Logo3D: Failed to load three.js modules:', error)
    }
  }

  const initThree = () => {
    const container = containerRef.current
    if (!container) return

    // 防止重复初始化：如果已经有 renderer，先清理
    if (rendererRef.current) {
      const oldCanvas = container.querySelector('canvas')
      if (oldCanvas) {
        container.removeChild(oldCanvas)
      }
      rendererRef.current.dispose()
      rendererRef.current = null
    }

    const width = container.clientWidth
    const height = container.clientHeight
    
    if (width === 0 || height === 0) return

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const viewSize = 60
    const camera = new THREE.OrthographicCamera(
      -viewSize * (width / height),
      viewSize * (width / height),
      viewSize,
      -viewSize,
      0.1,
      1000
    )
    camera.position.set(0, 0, 50)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    renderer.domElement.style.opacity = '1'
    renderer.domElement.style.visibility = 'visible'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(50, 50, 50)
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)
    fillLight.position.set(-30, 20, 30)
    scene.add(fillLight)

    const spotLight = new THREE.SpotLight(0xffffff, 2, 300, Math.PI / 4, 0.3, 2)
    spotLight.position.set(-150, 0, 60)
    spotLight.target.position.set(-150, 0, 0)
    spotLight.castShadow = false
    scene.add(spotLight)
    scene.add(spotLight.target)
    spotLightRef.current = spotLight

    if (fontRef.current) {
      createText(scene, container)
    }
  }

  const createText = (scene: THREE.Scene, container: HTMLDivElement) => {
    // 如果已经有文字，先移除
    if (textMeshRef.current) {
      scene.remove(textMeshRef.current)
      textMeshRef.current = null
      letterMeshesRef.current = []
    }

    const text = 'PanYiYong'
    const group = new THREE.Group()

    const size = 40
    const depth = 8
    const spacing = 30
    const bevelThickness = 1.8
    const bevelSize = 1.0

    const TextGeometry = (window as any).__threeTextGeometry
    if (!TextGeometry) {
      console.error('Logo3D: TextGeometry not loaded')
      return
    }
    
    const letterMeshes: THREE.Mesh[] = []
    text.split('').forEach((char, index) => {
      const geometry = new TextGeometry(char, {
        font: fontRef.current,
        size: size,
        depth: depth,
        curveSegments: 16,
        bevelEnabled: true,
        bevelThickness: bevelThickness,
        bevelSize: bevelSize,
        bevelOffset: 0,
        bevelSegments: 8
      })

      geometry.computeBoundingBox()
      const centerOffset = -0.5 * (geometry.boundingBox!.max.x - geometry.boundingBox!.min.x)

      const baseColor = getColorForIndex(index)
      const material = new THREE.MeshPhongMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.3,
        shininess: 100,
        specular: 0xffffff,
        flatShading: false,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      const baseX = (index - text.length / 2) * spacing + centerOffset
      mesh.position.x = baseX
      mesh.userData.baseX = baseX
      mesh.userData.baseY = 0
      mesh.userData.index = index
      mesh.userData.baseScale = 1.0
      mesh.userData.baseColor = baseColor
      mesh.userData.material = material

      letterMeshes.push(mesh)
      group.add(mesh)
    })

    const box = new THREE.Box3().setFromObject(group)
    const center = box.getCenter(new THREE.Vector3())
    
    // 先居中
    group.position.set(-center.x, -center.y, 0)
    
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const viewSize = 60
    const aspect = containerWidth / containerHeight
    
    // 计算文字的实际尺寸（在 3D 空间中的尺寸）
    const textWidth = box.max.x - box.min.x
    const textHeight = box.max.y - box.min.y
    
    // 计算缩放比例，让文字尽可能填充容器（留一点边距）
    const scaleX = (viewSize * aspect * 2 * 0.95) / textWidth
    const scaleY = (viewSize * 2 * 0.95) / textHeight
    const scale = Math.min(scaleX, scaleY)
    
    // 应用缩放
    group.scale.set(scale, scale, scale)
    
    // 重新计算位置（缩放后）
    const scaledBox = new THREE.Box3().setFromObject(group)
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
    const scaledHeight = scaledBox.max.y - scaledBox.min.y
    
    // 水平居中，垂直对齐到底部（减少底部空白）
    // 将文字底部对齐到视图底部，留一点边距
    const bottomMargin = viewSize * 0.05
    const targetBottom = -viewSize + bottomMargin
    const currentBottom = scaledBox.min.y - scaledCenter.y
    const offsetY = targetBottom - currentBottom
    
    group.position.set(-scaledCenter.x, -scaledCenter.y + offsetY, 0)

    textMeshRef.current = group
    letterMeshesRef.current = letterMeshes
    scene.add(group)
  }

  const applyHoverEffect = (mesh: THREE.Mesh, time: number, effect: string) => {
    const baseColor = new THREE.Color(mesh.userData.baseColor)

    switch (effect) {
      case 'pulse': {
        const pulseScale = 1.0 + Math.sin(time * 10) * 0.25
        mesh.scale.set(pulseScale, pulseScale, pulseScale)
        const pulseBrightness = 1.2 + Math.sin(time * 8) * 0.3
        mesh.userData.material.color.copy(baseColor).multiplyScalar(pulseBrightness)
        break
      }
      case 'spin': {
        mesh.rotation.z += 0.1
        mesh.rotation.y += 0.05
        const spinScale = 1.0 + Math.sin(time * 6) * 0.15
        mesh.scale.set(spinScale, spinScale, spinScale)
        mesh.userData.material.color.copy(baseColor).multiplyScalar(1.4)
        break
      }
      case 'rainbow': {
        const hue = (time * 2 + mesh.userData.index) % 1
        const rainbowColor = new THREE.Color().setHSL(hue, 0.8, 0.6)
        mesh.userData.material.color.copy(rainbowColor)
        const rainbowScale = 1.0 + Math.sin(time * 5) * 0.1
        mesh.scale.set(rainbowScale, rainbowScale, rainbowScale)
        break
      }
      case 'bounce': {
        const bounceHeight = Math.abs(Math.sin(time * 8)) * 4
        mesh.position.y = mesh.userData.baseY + bounceHeight
        mesh.rotation.x = Math.sin(time * 6) * 0.3
        mesh.userData.material.color.copy(baseColor).multiplyScalar(1.5)
        break
      }
      case 'flip': {
        mesh.rotation.x = Math.sin(time * 4) * Math.PI
        mesh.rotation.y = Math.cos(time * 4) * 0.5
        const flipScale = 1.0 + Math.abs(Math.sin(time * 4)) * 0.2
        mesh.scale.set(flipScale, flipScale, flipScale)
        mesh.userData.material.color.copy(baseColor).multiplyScalar(1.3)
        break
      }
      case 'glow': {
        const glowIntensity = 1.5 + Math.sin(time * 12) * 0.5
        mesh.userData.material.color.copy(baseColor).multiplyScalar(glowIntensity)
        mesh.position.z = Math.sin(time * 6) * 2
        const glowScale = 1.0 + Math.sin(time * 7) * 0.15
        mesh.scale.set(glowScale, glowScale, glowScale)
        break
      }
      case 'wave': {
        const waveOffset = Math.sin(time * 5 + mesh.userData.index) * 0.3
        mesh.rotation.z = waveOffset
        mesh.position.x = mesh.userData.baseX + Math.sin(time * 4) * 2
        const waveScale = 1.0 + Math.abs(waveOffset) * 0.2
        mesh.scale.set(waveScale, waveScale, waveScale)
        mesh.userData.material.color.copy(baseColor).multiplyScalar(1.4)
        break
      }
      case 'zoom': {
        const zoomScale = 1.3 + Math.sin(time * 6) * 0.2
        mesh.scale.set(zoomScale, zoomScale, zoomScale)
        mesh.rotation.z = Math.sin(time * 8) * 0.2
        mesh.userData.material.color.copy(baseColor).multiplyScalar(1.6)
        break
      }
      default: {
        const defaultScale = 1.0 + Math.sin(time * 8) * 0.2
        mesh.scale.set(defaultScale, defaultScale, defaultScale)
        mesh.userData.material.color.copy(baseColor).multiplyScalar(1.3)
      }
    }
  }

  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return
    }
    
    animationIdRef.current = requestAnimationFrame(animate)

    const time = Date.now() * 0.001

    if (letterMeshesRef.current && letterMeshesRef.current.length > 0) {
      letterMeshesRef.current.forEach((mesh, index) => {
        if (isHoveringRef.current && index === hoveredLetterIndexRef.current) {
          applyHoverEffect(mesh, time, hoveredLetterEffectRef.current || 'pulse')
        } else {
          const phase = (time * 2 + index * 0.5) % (Math.PI * 2)
          const jumpHeight = Math.abs(Math.sin(phase)) * 2
          mesh.position.y = mesh.userData.baseY + jumpHeight
          
          const targetScale = mesh.userData.baseScale
          const currentScale = mesh.scale.x
          const newScale = currentScale + (targetScale - currentScale) * 0.1
          mesh.scale.set(newScale, newScale, newScale)

          const baseColor = new THREE.Color(mesh.userData.baseColor)
          const currentColor = mesh.userData.material.color
          currentColor.lerp(baseColor, 0.1)

          mesh.rotation.x *= 0.9
          mesh.rotation.y *= 0.9
          mesh.rotation.z *= 0.9

          mesh.position.z *= 0.9
          const targetX = mesh.userData.baseX
          mesh.position.x = mesh.position.x + (targetX - mesh.position.x) * 0.1
        }
      })
    }

    if (spotLightRef.current) {
      const sweepSpeed = 0.5
      const sweepRange = 300
      const lightX = (Math.sin(time * sweepSpeed) * 0.5 + 0.5) * sweepRange - sweepRange / 2
      spotLightRef.current.position.x = lightX
      spotLightRef.current.target.position.x = lightX
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="logo-3d-container"
      style={{
        width: '140px',
        height: '33px',
        position: 'relative',
        overflow: 'visible',
        background: 'transparent',
        minWidth: '140px',
        minHeight: '33px',
        display: 'block'
      }}
    />
  )
}

