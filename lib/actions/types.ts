export type ActionResult = {
  success: boolean;
  error?: string;
};

export function actionError(message: string): ActionResult {
  return { success: false, error: message };
}

export function actionSuccess(): ActionResult {
  return { success: true };
}
