import { Networking } from "@flamework/networking";

interface ServerEvents {
	MouseEvent(MousePosition: Vector3, FireAttachment: Vector3): void;
}

interface ClientEvents {
	MouseEvent(MousePosition: Vector3, FireAttachment: Vector3): void;
}

interface ServerFunctions {}

interface ClientFunctions {}

export const GlobalEvents = Networking.createEvent<ServerEvents, ClientEvents>();
export const GlobalFunctions = Networking.createFunction<ServerFunctions, ClientFunctions>();
