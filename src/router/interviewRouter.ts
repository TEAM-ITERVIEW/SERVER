import { Router } from 'express';
import { body, header, param } from 'express-validator';
import { interviewController } from '../controller';
import errorValidator from '../middleware/error/errorValidator';
import { error } from 'console';
import { auth } from '../middleware';

const router: Router = Router();

router.post(
  '/',
  [
    body('subjectText').notEmpty(),
    body('questionNum').notEmpty(),
    body('onlyVoice').notEmpty(),
    body('startDateTime').notEmpty(),
  ],
  errorValidator,
  auth,
  interviewController.startInterview,
);

router.post(
  '/answers/:interviewQuestionId',
  [
    param('interviewQuestionId').notEmpty(),
    body('mumble'),
    body('silent'),
    body('talk'),
    body('time'),
    body('text'),
  ],
  errorValidator,
  interviewController.makeFeedback,
);

router.post(
  '/picture/:interviewQuestionId',
  [
    param('interviewQuestionId').notEmpty(),
    body('emotion').notEmpty()
  ],
  errorValidator,
  interviewController.saveEmotion,
);

router.patch(
  '/:interviewId',
  [
    param('interviewId').notEmpty(),
    body('endDateTime'),
  ],
  errorValidator,
  interviewController.endInterview,
);

router.get(
  '/result/:interviewId',
  [
    param('interviewId').notEmpty(),
  ],
  errorValidator,
  interviewController.resultInterview,
);

router.delete(
  '/:interviewId',
  [
    param('interviewId').notEmpty(),
  ],
  errorValidator,
  interviewController.deleteInterview,

)

export default router;