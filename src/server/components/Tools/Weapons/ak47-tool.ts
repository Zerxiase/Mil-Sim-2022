import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import FastCast, { ActiveCast } from "@rbxts/fastcast";
import { Debris, ReplicatedStorage, Workspace } from "@rbxts/services";
import { Events } from "server/network";
import PartCacheModule from "@rbxts/partcache";
FastCast.DebugLogging = false;
FastCast.VisualizeCasts = false;

const CosmeticBulletsFolder =
	Workspace.FindFirstChild("CosmeticBulletsFolder") || (new Instance("Folder", Workspace) as Folder);
CosmeticBulletsFolder.Name = "CosmeticBulletsFolder";

const CosmeticBullet = new Instance("Part");
CosmeticBullet.Material = Enum.Material.Neon;
CosmeticBullet.Color = Color3.fromRGB(214, 219, 13);
CosmeticBullet.CanCollide = false;
CosmeticBullet.Anchored = true;
CosmeticBullet.Size = new Vector3(0.2, 0.2, 2.4);

const Blood = ReplicatedStorage.FindFirstChild("Tools")!
	.FindFirstChild("Blood")!
	.FindFirstChild("Blood")!
	.FindFirstChild("Attachment")!
	.FindFirstChild("Blood")! as ParticleEmitter;

let FirePointPos: Vector3;

let canFire = true;
const bulletSpeed = 1000;
const bulletMaxDist = 10000;
const bulletGravity = new Vector3(0, -Workspace.Gravity, 2);
const minBulletSpreadAngle = 1;
const maxBulletSpreadAngle = 1.5;
const fireDelay = 0.1;
const bulletsPerShot = 1;
const pierceDemo = true;

const CastParams = new RaycastParams();
CastParams.IgnoreWater = true;
CastParams.FilterType = Enum.RaycastFilterType.Blacklist;
CastParams.FilterDescendantsInstances = [];

const CosmeticPartProvider = new PartCacheModule(CosmeticBullet, 100);

const CastBehavior = FastCast.newBehavior();
CastBehavior.RaycastParams = CastParams;
CastBehavior.MaxDistance = bulletMaxDist;
CastBehavior.CosmeticBulletContainer = CosmeticBulletsFolder;
CastBehavior.CosmeticBulletProvider = CosmeticPartProvider;
CastBehavior.Acceleration = bulletGravity;
CastBehavior.AutoIgnoreContainer = false;

interface ak47_tool extends Tool {}

interface Attributes {}

@Component({
	tag: "ak47_tool",
	defaults: {},
})
export class Ak47Component_Server extends BaseComponent<Attributes, ak47_tool> implements OnStart {
	private Tool = this.instance as Tool;
	private Handle = this.Tool.FindFirstChild("Handle") as MeshPart;

	private RNG = new Random();
	private TAU = math.pi * 2;

	private Caster = new FastCast();

	constructor() {
		super();
	}

	PlayFireSound() {
		const fire = new Instance("Sound", Workspace);
		fire.SoundId = "rbxassetid://5910000043";
		fire.PlayOnRemove = true;
		fire.Destroy();
	}

	MakeParticleFX(position: Vector3, normal: Vector3) {
		const Attachment = new Instance("Attachment");
		Attachment.CFrame = new CFrame(position, position.add(normal));
		Attachment.Parent = Workspace.Terrain;

		const particle = Blood.Clone();
		particle.Parent = Attachment;
		Debris.AddItem(Attachment, particle.Lifetime.Max);

		particle.Enabled = true;
		task.wait(0.05);
		particle.Enabled = false;
	}

	Reflect(surfaceNormal: Vector3, bulletNormal: Vector3) {
		return bulletNormal.sub(surfaceNormal.mul(2 * bulletNormal.Dot(surfaceNormal)));
	}

	CanRayPierce(cast: ActiveCast, rayResult: RaycastResult, segmentVelocity: Vector3) {
		const hits = cast.UserData;
	}

	Fire(direction: Vector3) {
		if (this.Tool.Parent!.IsA("Backpack")) return;

		const directionalCF = new CFrame(new Vector3(), direction);

		const _direction = directionalCF.mul(
			CFrame.fromOrientation(0, 0, this.RNG.NextNumber(0, this.TAU)).mul(
				CFrame.fromOrientation(math.rad(this.RNG.NextNumber(minBulletSpreadAngle, maxBulletSpreadAngle)), 0, 0),
			),
		).LookVector;

		const hrp = this.Tool.Parent?.WaitForChild("HumanoidRootPart", 1) as Part;
		const modifiedBulletSpeed = _direction.mul(bulletSpeed);

		const simBullet = this.Caster.Fire(FirePointPos, _direction, modifiedBulletSpeed, CastBehavior);

		this.PlayFireSound();
	}

	OnRayHit(cast: ActiveCast, raycastresult: RaycastResult, segmentvelocity: Vector3, cosmeticbulletobject: Instance) {
		const hitPart = raycastresult.Instance;
		const hitPoint = raycastresult.Position;
		const normal = raycastresult.Normal;
		if (hitPart !== undefined && hitPart.Parent !== undefined) {
			const humanoid = hitPart.Parent.FindFirstChildOfClass("Humanoid") as Humanoid;
			if (humanoid) {
				humanoid.TakeDamage(10);
			}
			if (hitPart.Parent.FindFirstChild("Humanoid")) {
				this.MakeParticleFX(hitPoint, normal);
			}
		}
	}

	OnRayPierced(
		cast: ActiveCast,
		raycastresult: RaycastResult,
		segmentvelocity: Vector3,
		cosmeticbulletobject: Instance,
	) {
		const position = raycastresult.Position;
		const normal = raycastresult.Normal;

		const newNormal = this.Reflect(normal, segmentvelocity.Unit);
		cast.SetVelocity(newNormal.mul(segmentvelocity.Magnitude));

		cast.SetPosition(position);
	}

	OnRayUpdated(
		cast: ActiveCast,
		segmentorigin: Vector3,
		segmentdirection: Vector3,
		length: number,
		segmentvelocity: Vector3,
		cosmeticbulletobject: Instance,
	) {
		if (cosmeticbulletobject === undefined) return;
		const thing = cosmeticbulletobject as Part;
		const bulletLength = thing.Size.Z / 2;
		const baseCFrame = new CFrame(segmentorigin, segmentorigin.add(segmentdirection));
		thing.CFrame = baseCFrame.mul(new CFrame(0, 0, -(length - bulletLength)));
	}

	OnRayTerminated(cast: ActiveCast) {
		const cosmeticBullet = cast.RayInfo.CosmeticBulletObject as Part;
		if (cosmeticBullet !== undefined) {
			if (CastBehavior.CosmeticBulletProvider !== undefined) {
				CosmeticPartProvider.ReturnPart(cosmeticBullet);
			} else {
				cosmeticBullet.Destroy();
			}
		}
	}

	onStart() {
		Events.MouseEvent.connect((Player: Player, MousePosition: Vector3, firePart: Vector3) => {
			const char = this.Tool.Parent as Model;
			if (Player.Name !== char.Name) return;
			if (!canFire) {
				return;
			}
			FirePointPos = firePart;
			canFire = false;
			const mouseDirection = MousePosition.sub(FirePointPos).Unit;
			this.Fire(mouseDirection);
			if (fireDelay > 0.03) task.wait(fireDelay);
			canFire = true;
		});

		this.Caster.RayHit.Connect((cast, raycastresult, segmentvelocity, cosmeticbulletobject) => {
			this.OnRayHit(cast, raycastresult, segmentvelocity, cosmeticbulletobject!);
		});
		this.Caster.RayPierced.Connect((cast, raycastresult, segmentvelocity, cosmeticbulletobject) => {
			this.OnRayPierced(cast, raycastresult, segmentvelocity, cosmeticbulletobject!);
		});
		this.Caster.LengthChanged.Connect(
			(cast, segmentorigin, segmentdirection, length, segmentvelocity, cosmeticbulletobject) => {
				this.OnRayUpdated(
					cast,
					segmentorigin,
					segmentdirection,
					length,
					segmentvelocity,
					cosmeticbulletobject!,
				);
			},
		);
		this.Caster.CastTerminating.Connect((cast) => {
			this.OnRayTerminated(cast);
		});

		this.Tool.Equipped.Connect(() => {
			const char = this.Tool.Parent as Model;
			CastParams.FilterDescendantsInstances.push(char, CosmeticBulletsFolder);
		});
	}
}
