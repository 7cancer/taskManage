import { Task } from '../../domain/task/types';

export function syncTaskToViews(task: Task): Task {
  // TODO: カンバン/ガント別ViewModelを導入する場合はここで変換する。
  return task;
}
