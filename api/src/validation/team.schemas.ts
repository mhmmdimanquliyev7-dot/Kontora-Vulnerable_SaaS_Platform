import { z } from "zod";

const roleSchema = z.enum(["OWNER", "ACCOUNTANT", "MEMBER", "CLIENT_GUEST"]);

export const inviteMemberSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    name: z.string().trim().min(1, "Name is required").max(200),
    role: roleSchema,
    clientId: z.uuid().optional(),
  })
  .refine((data) => data.role !== "CLIENT_GUEST" || !!data.clientId, {
    message: "clientId is required when inviting a CLIENT_GUEST",
    path: ["clientId"],
  });

export const changeRoleSchema = z.object({
  role: roleSchema,
});
