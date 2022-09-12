import { OnStart, OnRender } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import {
	Players,
	ReplicatedStorage,
	UserInputService as UIS,
	Workspace,
	RunService as RS,
	TweenService,
} from "@rbxts/services";
import { Events } from "client/network";
import { Animation } from "@rbxts/animation";
import { Spring } from "shared/classes/SpringClass/spring";
const newSpring = new Spring();

const RecoilSpring = new Spring();
const BobbleSpring = new Spring();
const SwaySpring = new Spring();

const myAnimations = {
	ak47: Animation.createAnimations({ idle: 10882919736 }),
};

const myMouse = Players.LocalPlayer.GetMouse() as Mouse;

interface ak47_tool extends Tool {}

interface Attributes {
	IsEquipped: boolean;
	IsDeleted: boolean;

	Mouse: Mouse;
	ExpectingInput: boolean;
	IsMouseDown: boolean;
}

@Component({
	tag: "ak47_tool",
	defaults: {
		IsEquipped: false,
		IsDeleted: true,
		Mouse: myMouse,
		ExpectingInput: false,
		IsMouseDown: false,
	},
})
export class Ak47Component_Client extends BaseComponent<Attributes, ak47_tool> implements OnStart, OnRender {
	private Tool = this.instance as Tool;
	private Handle = this.Tool.FindFirstChild("Handle") as MeshPart;
	private MouseEvent = Events.MouseEvent;
	private Mouse: Mouse;

	public Camera = Workspace.CurrentCamera as Camera;
	public FirePointObject = this.instance.FindFirstChild("Muzzle") as MeshPart;

	public ToolModels = ReplicatedStorage.FindFirstChild("Tools")!.FindFirstChild("WeaponModels") as Folder;
	public ak47 = this.ToolModels.FindFirstChild("ak47_tool")! as Model;

	constructor() {
		super();
		this.Mouse = myMouse;
	}

	getBobbing(addition: number) {
		return math.sin(tick() * addition * 1.3) * 0.5;
	}

	render(viewmodel: Model, dt: number, recoilSpring: Spring, bobbleSpring: Spring, swaySpring: Spring) {
		if (!this.attributes.IsEquipped) return;
		const ak47 = this.Camera.FindFirstChildOfClass("Model") as Model;
		const hum = ak47.FindFirstChild("HumanoidRootPart")! as Part;
		ak47.SetPrimaryPartCFrame(this.Camera.CFrame);

		const bobble = new Vector3(this.getBobbing(10), this.getBobbing(5), this.getBobbing(5));
		const mouseDelta = UIS.GetMouseDelta();

		const Character = Players.LocalPlayer.Character || (Players.LocalPlayer.CharacterAdded.Wait()[0] as Model);
		const hum_ = Character.FindFirstChild("HumanoidRootPart") as Part;

		bobbleSpring.shove(bobble.div(10).mul(hum_.Velocity.Magnitude).div(10));
		swaySpring.shove(new Vector3(-mouseDelta.X / 500, mouseDelta.Y / 200, 0));

		const updatedRecoilSpring = recoilSpring.update(dt);
		const updatedBobbleSpring = bobbleSpring.update(dt);
		const updatedSwaySpring = swaySpring.update(dt);

		hum.CFrame = hum.CFrame.ToWorldSpace(new CFrame(updatedBobbleSpring.Y, updatedBobbleSpring.X, 0));
		hum.CFrame = hum.CFrame.mul(new CFrame(updatedSwaySpring.X, updatedSwaySpring.Y, 0));

		hum.CFrame = hum.CFrame.mul(CFrame.Angles(math.rad(updatedRecoilSpring.X) * 2, 0, 0));
		this.Camera.CFrame = this.Camera.CFrame.mul(
			CFrame.Angles(
				math.rad(updatedRecoilSpring.X),
				math.rad(updatedRecoilSpring.Y),
				math.rad(updatedRecoilSpring.Z),
			),
		);
	}

	onEquipped(playerMouse: Mouse) {
		this.Mouse = playerMouse;
		this.attributes.IsEquipped = true;
		this.attributes.ExpectingInput = true;
		this.attributes.IsMouseDown = false;
		for (const i of this.instance.GetChildren()) {
			const a = i as MeshPart;
			a.Transparency = 1;
		}
		this.ak47.Clone().Parent = this.Camera;
		const Animator = this.Camera.FindFirstChildOfClass("Model")!
			.FindFirstChild("Humanoid")!
			.FindFirstChild("Animator") as Animator;
		print(Animator);
		Animation.loadAnimator(Animator! as Animator, myAnimations)["ak47"].idle.Play();
	}

	onUnequipped() {
		this.attributes.IsDeleted = false;
		this.attributes.IsEquipped = false;
		this.attributes.ExpectingInput = false;
		this.attributes.IsMouseDown = false;
		this.Camera.FindFirstChildOfClass("Model")!.Destroy();
	}

	onStart() {
		this.Tool.Equipped.Connect((m) => {
			this.onEquipped(m);
		});
		this.Tool.Unequipped.Connect(() => {
			this.onUnequipped();
		});

		const ti = new TweenInfo(0.5, Enum.EasingStyle.Sine);

		const char = Players.LocalPlayer.Character || (Players.LocalPlayer.CharacterAdded.Wait()[0] as Model);
		const humanoid = char.WaitForChild("Humanoid")! as Humanoid;

		UIS.InputBegan.Connect((Input: InputObject, gameProcessedEvent: boolean) => {
			if (gameProcessedEvent || !this.attributes.ExpectingInput) {
				return;
			}

			if (Input.UserInputType === Enum.UserInputType.MouseButton1 && this.attributes.Mouse !== undefined) {
				this.attributes.IsMouseDown = true;
			}

			if (Input.KeyCode === Enum.KeyCode.E) {
				TweenService.Create(humanoid, ti, { CameraOffset: new Vector3(3, 0, 0) }).Play();
			} else if (Input.KeyCode === Enum.KeyCode.Q) {
				TweenService.Create(humanoid, ti, { CameraOffset: new Vector3(-3, 0, 0) }).Play();
			}
		});

		UIS.InputEnded.Connect((Input: InputObject, gameProcessedEvent: boolean) => {
			if (gameProcessedEvent || !this.attributes.ExpectingInput) {
				return;
			}

			if (Input.UserInputType === Enum.UserInputType.MouseButton1 && this.attributes.Mouse !== undefined) {
				this.attributes.IsMouseDown = false;
			}

			if (Input.KeyCode === Enum.KeyCode.E) {
				TweenService.Create(humanoid, ti, { CameraOffset: new Vector3(0, 0, 0) }).Play();
			} else if (Input.KeyCode === Enum.KeyCode.Q) {
				TweenService.Create(humanoid, ti, { CameraOffset: new Vector3(0, 0, 0) }).Play();
			}
		});

		RS.Heartbeat.Connect((dt) => {
			if (this.attributes.IsMouseDown) {
				const muzzle = this.Camera.FindFirstChildOfClass("Model")!
					.FindFirstChild("Muzzle")!
					.FindFirstChild("FirePoint") as Attachment;

				RecoilSpring.shove(new Vector3(3, math.random(-2, 2), 10));

				coroutine.wrap(() => {
					task.wait(0.2);
					RecoilSpring.shove(new Vector3(-2.8, math.random(-1, 1), -10));
				});

				this.MouseEvent.fire(this.Mouse.Hit.Position, muzzle.WorldPosition);
			}
		});
	}

	onRender(dt: number): void {
		if (this.attributes.IsEquipped) {
			const myWeapon = this.Camera.FindFirstChildOfClass("Model")! as Model;
			this.render(myWeapon, dt, RecoilSpring, BobbleSpring, SwaySpring);
		}
	}
}

/*

	connection = RS.RenderStepped.Connect((dt) => {
			ak47.SetPrimaryPartCFrame(this.Camera.CFrame);

			const bobble = new Vector3(this.getBobbing(10), this.getBobbing(5), this.getBobbing(5));
			const mouseDelta = UIS.GetMouseDelta();

			const character = Players.LocalPlayer.Character || (Players.LocalPlayer.CharacterAdded.Wait()[0] as Model);
			const hum_ = character.FindFirstChild("HumanoidRootPart")! as Part;

			newSpring.shove(bobble.div(10 * hum_.Velocity.Magnitude).div(10));
			newSpring.shove(new Vector3(-mouseDelta.X / 500, mouseDelta.Y / 200, 0));

			const UpdatedRecoilSpring = newSpring.update(dt);
			const UpdatedBobbleSpring = newSpring.update(dt);
			const UpdatedSwaySpring = newSpring.update(dt);

			const hum = ak47.FindFirstChild("HumanoidRootPart")! as Part;

			const b: CFrame = CFrame.Angles(
				math.rad(UpdatedRecoilSpring.X),
				math.rad(UpdatedRecoilSpring.Y),
				math.rad(UpdatedRecoilSpring.Z),
			);

			hum.CFrame = hum.CFrame.ToWorldSpace(new CFrame(UpdatedBobbleSpring.Y, UpdatedBobbleSpring.X, 0));
			hum.CFrame = hum.CFrame.mul(new CFrame(UpdatedSwaySpring.X, UpdatedSwaySpring.Y, 0));

			hum.CFrame = hum.CFrame.mul(CFrame.Angles(math.rad(UpdatedRecoilSpring.X), 0, 0));
			this.Camera.CFrame = this.Camera.CFrame.mul(
				CFrame.Angles(
					math.rad(UpdatedRecoilSpring.X),
					math.rad(UpdatedRecoilSpring.Y),
					math.rad(UpdatedRecoilSpring.Z),
				),
			);
		});

/*/
