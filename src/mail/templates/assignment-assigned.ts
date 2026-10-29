import { renderEmail, type EmailMessage } from './layout.js';

export interface AssignmentAssignedEmailContext {
  firstName: string;
  assignerName: string;
  organizationName: string;
  taskName: string;
  dueDate: string;
  assignmentUrl: string;
}

export function renderAssignmentAssignedEmail(
  context: AssignmentAssignedEmailContext,
): EmailMessage {
  const rendered = renderEmail({
    preheader: `${context.assignerName} assigned you "${context.taskName}" on LaunchDesk.`,
    heading: 'New assignment',
    paragraphs: [
      `Hi ${context.firstName},`,
      `${context.assignerName} assigned you a task in ${context.organizationName}.`,
      `Task: ${context.taskName}`,
      `Due date: ${context.dueDate}`,
    ],
    buttonLabel: 'Open assignment',
    buttonUrl: context.assignmentUrl,
    footer:
      'You received this email because you were assigned a task on LaunchDesk.',
  });

  return {
    subject: 'You have a new assignment on LaunchDesk',
    ...rendered,
  };
}
