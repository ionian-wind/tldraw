import { Box } from '../Box'
import { Vec } from '../Vec'
import { pointInPolygon } from '../utils'

export interface Geometry2dOptions {
	isFilled: boolean
	isClosed: boolean
	isLabel?: boolean
	debugColor?: string
	ignore?: boolean
}

/** @public */
export abstract class Geometry2d {
	isFilled = false
	isClosed = true
	isLabel = false
	debugColor?: string
	ignore?: boolean

	constructor(opts: Geometry2dOptions) {
		this.isFilled = opts.isFilled
		this.isClosed = opts.isClosed
		this.isLabel = opts.isLabel ?? false
		this.debugColor = opts.debugColor
		this.ignore = opts.ignore
	}

	abstract getVertices(): Vec[]

	abstract nearestPoint(point: Vec): Vec

	hitTestPoint(point: Vec, margin = 0, hitInside = false) {
		// We've removed the broad phase here; that should be done outside of the call
		return this.distanceToPoint(point, hitInside) <= margin
	}

	distanceToPoint(point: Vec, hitInside = false) {
		const dist = point.dist(this.nearestPoint(point))

		if (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)) {
			return -dist
		}
		return dist
	}

	distanceToLineSegment(A: Vec, B: Vec) {
		const point = this.nearestPointOnLineSegment(A, B)
		const dist = Vec.DistanceToLineSegment(A, B, point) // repeated, bleh
		return this.isClosed && this.isFilled && pointInPolygon(point, this.vertices) ? -dist : dist
	}

	hitTestLineSegment(A: Vec, B: Vec, distance = 0): boolean {
		return this.distanceToLineSegment(A, B) <= distance
	}

	nearestPointOnLineSegment(A: Vec, B: Vec): Vec {
		const { vertices } = this
		let nearest: Vec | undefined
		let dist = Infinity
		let d: number
		let p: Vec
		for (let i = 0; i < vertices.length; i++) {
			p = vertices[i]
			d = Vec.DistanceToLineSegment(A, B, p)
			if (d < dist) {
				dist = d
				nearest = p
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	isPointInBounds(point: Vec, margin = 0) {
		const { bounds } = this
		return !(
			point.x < bounds.minX - margin ||
			point.y < bounds.minY - margin ||
			point.x > bounds.maxX + margin ||
			point.y > bounds.maxY + margin
		)
	}

	private _vertices: Vec[] | undefined

	// eslint-disable-next-line no-restricted-syntax
	get vertices(): Vec[] {
		if (!this._vertices) {
			this._vertices = this.getVertices()
		}

		return this._vertices
	}

	getBounds() {
		return Box.FromPoints(this.vertices)
	}

	private _bounds: Box | undefined

	// eslint-disable-next-line no-restricted-syntax
	get bounds(): Box {
		if (!this._bounds) {
			this._bounds = this.getBounds()
		}
		return this._bounds
	}

	// eslint-disable-next-line no-restricted-syntax
	get center() {
		return this.bounds.center
	}

	private _area: number | undefined

	// eslint-disable-next-line no-restricted-syntax
	get area() {
		if (!this._area) {
			this._area = this.getArea()
		}
		return this._area
	}

	getArea() {
		if (!this.isClosed) {
			return 0
		}
		const { vertices } = this
		let area = 0
		for (let i = 0, n = vertices.length; i < n; i++) {
			const curr = vertices[i]
			const next = vertices[(i + 1) % n]
			area += curr.x * next.y - next.x * curr.y
		}
		return area / 2
	}

	toSimpleSvgPath() {
		let path = ''

		const { vertices } = this
		const n = vertices.length

		if (n === 0) return path

		path += `M${vertices[0].x},${vertices[0].y}`

		for (let i = 1; i < n; i++) {
			path += `L${vertices[i].x},${vertices[i].y}`
		}

		if (this.isClosed) {
			path += 'Z'
		}

		return path
	}
}
