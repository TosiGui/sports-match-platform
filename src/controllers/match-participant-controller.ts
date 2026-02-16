import type { JoinMatchData, UpdateParticipantStatusData } from "../services/match-participant-service";
import { MatchParticipantService } from "../services/match-participant-service";
import type { MatchParticipant } from "../../generated/prisma/client";

export interface MatchParticipantControllerContract {
  joinMatch(data: JoinMatchData): Promise<MatchParticipant>;
  listParticipantsByMatch(matchId: string): Promise<MatchParticipant[]>;
  updateParticipantStatus(id: string, data: UpdateParticipantStatusData): Promise<MatchParticipant | null>;
  leaveMatch(matchId: string, userId: string): Promise<boolean>;
}

export class MatchParticipantController implements MatchParticipantControllerContract {
  private constructor(private readonly service: MatchParticipantService) {}

  static resolve(): MatchParticipantControllerContract {
    const service = MatchParticipantService.resolve();
    return new MatchParticipantController(service);
  }

  async joinMatch(data: JoinMatchData) {
    return this.service.joinMatch(data);
  }

  async listParticipantsByMatch(matchId: string) {
    return this.service.listParticipantsByMatch(matchId);
  }

  async updateParticipantStatus(id: string, data: UpdateParticipantStatusData) {
    return this.service.updateParticipantStatus(id, data.status);
  }

  async leaveMatch(matchId: string, userId: string) {
    return this.service.leaveMatch(matchId, userId);
  }
}
