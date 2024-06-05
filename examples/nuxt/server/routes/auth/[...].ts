import { Auth } from "@auth/core";
import { authConfig } from "~/server/auth";


export default defineEventHandler(async (event) =>
	Auth(toWebRequest(event), authConfig),
);
