export const UserRoleEnum = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member"
};

export const UserRolesEnum = UserRoleEnum;

export const AvailableUserRole = Object.values(UserRoleEnum);

export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done"
};

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);
export const AvailableTaskStatues = AvailableTaskStatuses;