import { myJourneyMilestoneRepository } from './milestone.repository';

export class MyJourneyMilestoneEvaluator {
  
  /**
   * Evaluates and creates the "first_bible_note" milestone if it doesn't exist.
   * Because milestone creation is idempotent via merge, we can just save it.
   */
  async evaluateFirstBibleNote(userId: string): Promise<void> {
    if (!userId) return;
    
    await myJourneyMilestoneRepository.saveMilestone({
      id: `first_bible_note`,
      userId,
      type: 'first_bible_note',
      title: 'Your First Bible Note'
    });
  }

  /**
   * Evaluates and creates the "first_highlight" milestone if it doesn't exist.
   */
  async evaluateFirstHighlight(userId: string): Promise<void> {
    if (!userId) return;

    await myJourneyMilestoneRepository.saveMilestone({
      id: `first_highlight`,
      userId,
      type: 'first_highlight',
      title: 'Your First Highlight'
    });
  }

  /**
   * Evaluates and creates the "reading_plan_completed" milestone.
   */
  async evaluateReadingPlanCompleted(userId: string, planId: string, planTitle: string): Promise<void> {
    if (!userId || !planId) return;

    await myJourneyMilestoneRepository.saveMilestone({
      id: `completed_plan_${planId}`,
      userId,
      type: 'reading_plan_completed',
      title: `Reading Plan Completed`,
      metadata: {
        planId,
        planTitle
      }
    });
  }

  // Future: evaluateBibleBookCompleted
}

export const myJourneyMilestoneEvaluator = new MyJourneyMilestoneEvaluator();
