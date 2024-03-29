import { startInterviewDTO, makeFeedbackDTO, saveEmotionDTO } from '../interface/DTO';
import { Request, Response, NextFunction } from 'express';
import { message, statusCode } from '../module/constant';
import { success } from '../module/constant/utils';
import { interviewService } from '../service';

const startInterview = async (req: Request, res: Response, next: NextFunction) => {
  const startInterviewDTO: startInterviewDTO = req.body;
  const refreshToken = req.body;

  try {
    const data = await interviewService.startInterview(startInterviewDTO, refreshToken);

    return res
      .status(statusCode.CREATED)
      .send(success(statusCode.CREATED, message.START_INTERVIEW_SUCCESS, data));
  } catch (error) {
    next(error);
  }
};

const makeFeedback = async (req: Request, res: Response, next: NextFunction) => {
    const makeFeedbackDTO: makeFeedbackDTO = req.body;
    const {interviewQuestionId} = req.params
    try {
        const data = await interviewService.makeFeedback(makeFeedbackDTO, +interviewQuestionId);

        return res
        .status(statusCode.CREATED)
        .send(success(statusCode.CREATED, message.MAKE_FEEDBACK_SUCCESS, data));
    } catch (error) {
        next(error);
    }
};

const saveEmotion = async (req: Request, res: Response, next: NextFunction) => {
    const saveEmotionDTO: saveEmotionDTO = req.body;
    const {interviewQuestionId} = req.params
    try {
        const data = await interviewService.saveEmotion(saveEmotionDTO, +interviewQuestionId);

        return res
        .status(statusCode.CREATED)
        .send(success(statusCode.CREATED, message.SAVE_EMOTION_SUCCESS, data));
    } catch (error) {
        next(error);
    }
}

const endInterview = async (req: Request, res: Response, next: NextFunction) => {
    const {interviewQuestionId} = req.params
    const endDateTime = req.body

    try {
        const data = await interviewService.endInterview(endDateTime, +interviewQuestionId);

        return res
        .status(statusCode.CREATED)
        .send(success(statusCode.CREATED, message.END_INTERVIEW_SUCCESS, data));
    } catch (error) {
        next(error);
    }
}

const firstResultInterview = async (req: Request, res: Response, next: NextFunction) => {
    const {interviewId} = req.params

    try {
        const data = await interviewService.firstResultInterview(+interviewId);

        return res
        .status(statusCode.CREATED)
        .send(success(statusCode.CREATED, message.FIRST_RESULT_INTERVIEW_SUCCESS, data));
    } catch (error) {
        next(error);
    }
}

export default {
  startInterview,
  makeFeedback,
  saveEmotion,
  endInterview,
  firstResultInterview,
};