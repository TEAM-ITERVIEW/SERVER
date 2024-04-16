import { startInterviewDTO, makeFeedbackDTO, saveEmotionDTO } from '../interface/DTO';
import { PrismaClient } from '@prisma/client';
import errorGenerator from '../middleware/error/errorGenerator';
import { message, statusCode } from '../module/constant';
import { count, error } from 'console';
import { Answer, Score } from '../index'
const prisma = new PrismaClient();

const findInterviewQuestionId = async(interviewId: number, questionId: number) => {
    const find = await prisma.interviewQuestion.findFirst({
            where:{
                interviewId: interviewId,
                questionId: questionId
            },
            select:{
                id: true
            }
        })
    return find!.id
}

const startInterview = async (startInterviewDTO: startInterviewDTO, refreshToken: string) => {
  try {
    const findUserId = await prisma.user.findFirst({
        where: {
            refreshToken: refreshToken,
        },
        select: {
            id: true,
        },
    });

    const findSubjectId = await prisma.subject.findFirst({
        where: {
            subjectText: startInterviewDTO.subjectText,
        },
        select: {
            id: true
        },
    });

    let countInterviewToday = await prisma.interview.count({
        where: {
            startDateTime: startInterviewDTO.startDateTime
        }
    });

    const questionList = await prisma.question.findMany({
        where: {
            subjectId: findSubjectId!.id
        },
        select: {
            id: true,
            questionText: true,
        },
    });

    const selectedQuestions = [];
    const numQuestions = Math.min(questionList.length, startInterviewDTO.questionNum);
    const shuffledQuestions = questionList.sort(() => Math.random() - 0.5);
    for (let i = 0; i < numQuestions; i++) {
        selectedQuestions.push(shuffledQuestions[i]);
    };
    
    const startDate = startInterviewDTO?.startDateTime.split("T")[0];

    const title = (startDate || '') + "모의면접" + countInterviewToday!+1;

    const createInterview = await prisma.interview.create({
        data: {
            userId: findUserId!.id,
            subjectId: findSubjectId!.id,
            startDateTime: startInterviewDTO!.startDateTime,
            questionNum: startInterviewDTO.questionNum,
            title: title,
            onlyVoice: startInterviewDTO.onlyVoice,
        },
    });

    const interviewQuestionPromises = await Promise.all(selectedQuestions.map(async (question) => {
        const createdInterviewQuestion = await prisma.interviewQuestion.create({
            data: {
                interviewId: createInterview.id,
                questionId: question.id,
                userId: findUserId!.id,
                subjectId: findSubjectId!.id,
            }
        });
        return {
            id: createdInterviewQuestion.id,
            questionText: question.questionText
        }
    }));

    const interview = ({
            id: createInterview.id,
            userId: createInterview.userId,
            subjectText: startInterviewDTO.subjectText,
            startDateTime: startInterviewDTO.startDateTime,
            questionNum: startInterviewDTO.questionNum,
            title: createInterview.title,
            onlyVoice: startInterviewDTO.onlyVoice,
            questionList: interviewQuestionPromises
        })
    return interview;
  } catch (error) {
    throw error;
  }
};

const makeFeedback = async (makeFeedbackDTO: makeFeedbackDTO, interviewQuestionId: number) => {
    try {
    const findInterviewQuestion = await prisma.interviewQuestion.findFirst({
        where: {
            id: interviewQuestionId,
        },
        select: {
            interviewId: true,
            questionId: true,
            userId: true,
            subjectId: true,
        }
    });

    const findQuestion = await prisma.question.findFirst({
        where: {
            id: findInterviewQuestion?.questionId
        },
        select: {
            questionText: true
        }
    })

    if (findInterviewQuestion) {
        const answer = await prisma.answer.create({
            data: {
                interviewQuestionId: interviewQuestionId,
                questionId: findInterviewQuestion.questionId,
                interviewId: findInterviewQuestion.interviewId,
                text: makeFeedbackDTO.text,
                mumble: makeFeedbackDTO.mumble,
                silent: makeFeedbackDTO.silent,
                talk: makeFeedbackDTO.talk,
                time: makeFeedbackDTO.time,
            }
        });

        const feedbackText = await Answer(findQuestion!.questionText!,makeFeedbackDTO.text);
        let score = await Score(findQuestion!.questionText!, makeFeedbackDTO.text)

        const feedback = await prisma.feedback.create({
            data: {
                interviewQuestionId: interviewQuestionId,
                answerId: answer.id,
                interviewId: answer.interviewId,
                score: +score,
                feedbackText: feedbackText,
            }
        })
        return answer;
    }
    } catch(error) {
        throw error;
    }
};

const saveEmotion = async (saveEmotionDTO: saveEmotionDTO, interviewQuestionId: number) => {
    try {
        const saveEmotion = await prisma.picture.create({
            data: {
                interviewQuestionId: interviewQuestionId,
                emotion: saveEmotionDTO.emotion
            }
        });
        return saveEmotion;
    } catch(error) {
        throw error;
    }
};

const getEmotionForInterview = async (interviewId: number) => {
    // interviewId에 해당하는 interviewQuestion들을 찾음
    const interviewQuestions = await prisma.interviewQuestion.findMany({
        where: {
            interviewId: interviewId,
        },
        select: {
            id: true,
        }
    });

    type EmotionCounts = {
        [key: string]: number;
    };
    
    const emotionCounts: EmotionCounts = {
        angry: 0,
        disgust: 0,
        fear: 0,
        happy: 0,
        sad: 0,
        surprise: 0,
        neutral: 0
    };

    for (const question of interviewQuestions) {
        const getEmotionList = await prisma.picture.findMany({
            where: {
                interviewQuestionId: question.id,
            },
            select: {
                emotion: true,
            }
        });

        getEmotionList.forEach(({ emotion }) => {
            emotionCounts[emotion]++;
        });
    }
    let totalNegativeEmotions = 0;
    let totalEmotions = 0;
    let totalPositiveEmotions = 0;
    let totalNeutralEmotions = 0;
    totalNegativeEmotions = emotionCounts.angry + emotionCounts.disgust + emotionCounts.fear + emotionCounts.sad;
    totalPositiveEmotions = emotionCounts.happy;
    totalNeutralEmotions = emotionCounts.surprise + emotionCounts.neutral;

    const saveEmotionCount = await prisma.interview.update({
        where: {
            id: interviewId,
        },
        data: {
            facePositive: totalPositiveEmotions,
            faceNegative: totalNegativeEmotions,
            faceNeutral: totalNeutralEmotions,
        }
    })
    if (totalNegativeEmotions == null) {
        totalNegativeEmotions = 0;
    }
    totalEmotions = Object.values(emotionCounts).reduce((sum, count) => sum + count, 0);
    if (totalEmotions == null) {
        totalEmotions = 0;
    }
    const threshold = totalEmotions / 2;

    if (threshold == 0) {
        return "굿";
    }
    else if (totalNegativeEmotions > threshold) {
        return "표정관리해";
    } else {
        return "굿";
    }
};

const calculateScore = (mumble:number, silent:number, talk:number) => {
    const mumbleScore = 20 - (mumble / (mumble + talk)) * 20;
    const silentScore = 10 - (silent / (silent + talk)) * 10;
    return mumbleScore + silentScore;
};

const getAnswerAndFeedback = async (questionId: number, interviewId: number) => {
    const answer = await prisma.answer.findFirst({
        where: {
            questionId: questionId,
            interviewId: interviewId
        },
        select: {
            id: true,
            text: true,
            time: true,
            mumble: true,
            silent: true,
            talk: true,
        }
    });
    
    const question = await prisma.question.findFirst({
        where: {
            id: questionId,
        },
        select: {
            questionText: true,
            sampleAnswer: true
        }
    })

    const feedback = await prisma.feedback.findFirst({
        where: {
            answerId: answer!.id,
            interviewId: interviewId
        },
        select: {
            score: true,
            feedbackText: true
        }
    });
    return {
        questionId: questionId,
        questionText: question!.questionText,
        sampleAnswer: question!.sampleAnswer,
        score: feedback!.score,
        text: answer!.text,
        feedbackText: feedback!.feedbackText,
        time: answer!.time,
        mumble: answer!.mumble,
        silent: answer!.silent,
        talk: answer!.talk,
    }
}

const getQuestionDetails = async (interviewId: number) => {
    const findQuestionList = await prisma.interviewQuestion.findMany({
        where: {
            interviewId: interviewId,
        },
        select: {
            id: true,
            interviewId: true,
            questionId: true,
        }
    })
    const questionDetails = [];
    for (const question of findQuestionList) {
        const details = await getAnswerAndFeedback(question.questionId, question.interviewId);
        questionDetails.push(details);
    }
    return questionDetails;
}

const endInterview = async (interviewId: number, endDateTime: string) => {
    try {
        const questionDetails = await getQuestionDetails(interviewId)

        let totalScore = 0;
        let otherScore = 0;
        
        questionDetails.forEach(question => {
            totalScore += question.score!;
            otherScore += calculateScore(question.mumble, question.silent, question.talk);
        });

        let otherFeedback = "말 잘하네";
        if (otherScore < 25 && 20 <= otherScore) {
            const otherFeedback = "웅얼거리는거 좀만 고쳐";
        };
        if (otherScore < 20 && 15 <= otherScore) {
            const otherFeedback = "말 제대로하자";
        };
        if (otherScore < 15) {
            const otherFeedback = "심각한데?";
        };

        const totalTime = questionDetails.reduce((total, detail) => total + detail.time, 0);

        const endInterview = await prisma.interview.update({
            where: {
                id: interviewId,
            },
            data: {
                score: (totalScore/questionDetails.length)*70 + otherScore/questionDetails.length,
                otherFeedback: otherFeedback + getEmotionForInterview(interviewId),
                textScore: (totalScore/questionDetails.length) * 70,
                otherScore: otherScore/questionDetails.length,
                totalTime: totalTime,
            }
        });

        const addEndDateTime = await prisma.interview.update({
            where: {
                id: interviewId,
            },
            data: {
                endDateTime: endDateTime
            }
        })

        const Interview = await prisma.interview.findFirst({
            where: {
                id: interviewId
            },
            select: {
                id: true,
                startDateTime: true,
                endDateTime: true,
                questionNum: true,
            }
        })
        return Interview;
    } catch(error) {
        throw new Error("what");
    }
};

const resultInterview = async (interviewId: number) => {
    try {
        const questionDetails = await getQuestionDetails(interviewId)
        const findInterview = await prisma.interview.findFirst({
            where: {
                id: interviewId,
            },
            select: {
                id: true,
                userId: true,
                subjectId: true,
                startDateTime: true,
                endDateTime: true,
                totalTime: true,
                questionNum: true,
                score: true,
                textScore: true,
                otherScore: true,
                facePositive: true,
                faceNegative: true,
                faceNeutral: true,
                otherFeedback: true,
                title: true,
                onlyVoice: true,
            }
        })

        const totalTime = questionDetails.reduce((total, detail) => total + detail.time, 0);
        const totalMumble = questionDetails.reduce((total, detail) => total + detail.mumble, 0);
        const totalTalk = questionDetails.reduce((total, detail) => total + detail.talk, 0);
        const totalSilent = questionDetails.reduce((total, detail) => total + detail.silent, 0);
        const mumbleRatio = totalMumble / totalTalk;
        const silentRatio = totalSilent / totalTalk;

        if (findInterview){
            const findSubjectText = await prisma.subject.findFirst({
                where: {
                    id: findInterview.subjectId
                },
                select: {
                    subjectText: true,
                }
            })
            const firstResult = ({
                    id: findInterview.id,
                    subjectText: findSubjectText?.subjectText,
                    startDateTime: findInterview.startDateTime,
                    endDateTime: findInterview.endDateTime,
                    totalTime: findInterview.totalTime,
                    questionNum: findInterview.questionNum,
                    score: findInterview.score,
                    textScore: findInterview.textScore,
                    otherScore: findInterview.otherScore,
                    mumblePercent: mumbleRatio,
                    silentPercent: silentRatio,
                    facePositive: findInterview.facePositive,
                    faceNegative: findInterview.faceNegative,
                    faceNeutral: findInterview.faceNeutral,
                    title: findInterview.title,
                    otherFeedback: findInterview.otherFeedback,
                    onlyVoice: findInterview.onlyVoice,
                    questionList: questionDetails,
            })
            return firstResult
        }

    } catch(error) {
        throw error;
    }
};

const deleteInterview = async (interviewId: number) => {
    try {
        const deleteInterview = await prisma.interview.delete({
            where: {
                id: interviewId,
            }
        });
        const deleteAnswer = await prisma.answer.deleteMany({
            where: {
                interviewId: interviewId,
            }
        });
        const deleteFeedback = await prisma.feedback.deleteMany({
            where: {
                interviewId: interviewId,
            }
        });
        const deleteInterviewQuestion = await prisma.interviewQuestion.deleteMany({
            where: {
                interviewId: interviewId,
            }
        });
    } catch(error) {
        throw error;
    }
}

export default {
    startInterview,
    makeFeedback,
    saveEmotion,
    endInterview,
    resultInterview,
    getAnswerAndFeedback,
    getQuestionDetails,
    deleteInterview,
  };