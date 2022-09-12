const ITERATIONS = 5;

export class Spring {
	target: Vector3;
	position: Vector3;
	velocity: Vector3;
	mass: number;
	force: number;
	damping: number;
	speed: number;

	constructor(mass?: number, force?: number, damping?: number, speed?: number) {
		this.target = new Vector3();
		this.position = new Vector3();
		this.velocity = new Vector3();

		this.mass = mass ?? 0.8;
		this.force = force ?? 40;
		this.damping = damping ?? 6;
		this.speed = speed ?? 1.9;
	}

	shove(shove_force: Vector3) {
		this.velocity = this.velocity.add(shove_force);
	}

	update(delta_time: number) {
		const scaled_delta_time = math.min(delta_time * this.speed) / ITERATIONS;

		const force = this.target.sub(this.position);
		let acceleration = force.mul(this.force).div(this.mass);

		acceleration = acceleration.sub(this.velocity.mul(this.damping));

		this.velocity = this.velocity.add(acceleration.mul(scaled_delta_time));
		this.position = this.position.add(this.velocity.mul(scaled_delta_time));
		return this.position;
	}
}
