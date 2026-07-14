import { useMutation } from "@tanstack/react-query";

import * as assistantApi from "@/lib/api/assistant";

export function useSendMessage() {
  return useMutation({ mutationFn: assistantApi.sendMessage });
}
