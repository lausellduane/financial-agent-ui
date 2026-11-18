import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GluestackUIProvider } from "./components/ui/gluestack-ui-provider";
import { Box } from "./components/ui/box";
import { VStack } from "./components/ui/vstack";
import { Text } from "./components/ui/text";
import { Button, ButtonText } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Spinner } from "./components/ui/spinner";
import { Composer } from "./components/Composer";
import { MonthTrend } from "./components/MonthTrend";
import { QuickQuestions } from "./components/QuickQuestions";
import { SpendingChart, type ChartState } from "./components/SpendingChart";
import { SummaryTiles } from "./components/SummaryTiles";
import { TopMerchantsCard } from "./components/TopMerchantsCard";
import * as DocumentPicker from "expo-document-picker";
import "./global.css";
import { parseMonths, type MonthSpend } from "./chart-data";
import {
  NO_REPORT,
  formatReportStatus,
  statusForFailedReportCheck,
} from "./report-status";

// Metro inlines this static process.env.EXPO_PUBLIC_* read at export time.
// On web, unset, blank, or "/" means same-origin: requests go to /api/* on this host.
// Native builds have no same-origin Worker, so an absolute origin is required.
// A missing URL renders an error screen. It does not throw during import.
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;
const trimmedApiUrl = (rawApiUrl ?? "").trim();
const BACKEND_URL =
  trimmedApiUrl === "" || trimmedApiUrl === "/"
    ? ""
    : trimmedApiUrl.replace(/\/+$/, "");
const missingNativeApiUrl = Platform.OS !== "web" && BACKEND_URL === "";

type ReportCheck =
  | { failed: false; body: unknown }
  | { failed: true; httpStatus: number | null };

type ChatMessage = { role: string; text: string };

async function readReportCheck(): Promise<ReportCheck> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/report`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { failed: true, httpStatus: response.status };
    return { failed: false, body: await response.json() };
  } catch {
    return { failed: true, httpStatus: null };
  }
}

function ChatMessages({
  messages,
  loading,
}: {
  messages: ChatMessage[];
  loading: boolean;
}) {
  return (
    <VStack space="sm" className="pb-4">
      {messages.length === 0 && (
        <Text className="text-center text-typography-400 my-8">
          Ask a quick question or type below.
        </Text>
      )}
      {messages.map((msg, index) => (
        <Box
          key={index}
          className={`p-3 rounded-xl max-w-[85%] ${
            msg.role === "user" ? "bg-blue-200 self-end" : "bg-slate-100 self-start"
          }`}
        >
          <Text className="text-typography-900">{msg.text}</Text>
        </Box>
      ))}
      {loading && <Spinner size="small" className="self-center my-4" />}
    </VStack>
  );
}

function Dashboard({
  width,
  status,
  loading,
  chartState,
  months,
  selectedMonth,
  onSelectMonth,
  onUpload,
  onRetry,
}: {
  width: number;
  status: string;
  loading: boolean;
  chartState: ChartState;
  months: MonthSpend[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
  onUpload: () => void;
  onRetry: () => void;
}) {
  const compactHeader = width <= 520;
  const fourTiles = width >= 1200 || (width >= 700 && width < 1000);
  const insightsRow = width >= 1200 || (width >= 700 && width < 1000);
  const sideBySide = width >= 1000 && width < 1200;
  const current =
    months.find((month) => month.month === selectedMonth) ??
    months[months.length - 1];

  return (
    <VStack space="lg" className="w-full">
      <Card className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm">
        <Box
          className={
            compactHeader
              ? "flex-col gap-3"
              : "flex-row items-center justify-between gap-4"
          }
        >
          <VStack space="xs" className="flex-1 min-w-0">
            <Text className="text-xl font-extrabold text-typography-900">
              Financial Agent
            </Text>
            <Text className="text-sm text-typography-500 font-medium">
              {status}
            </Text>
          </VStack>
          <Button
            size="lg"
            variant="default"
            isDisabled={loading}
            onPress={onUpload}
            className={`rounded-xl h-12 bg-blue-500 hover:bg-primary-700 active:bg-primary-800 text-white ${
              compactHeader ? "w-full" : ""
            }`}
          >
            <ButtonText className="font-semibold">
              {loading ? "Uploading…" : "Upload CSV"}
            </ButtonText>
          </Button>
        </Box>
      </Card>

      <SummaryTiles
        state={chartState}
        months={months}
        selectedMonth={selectedMonth}
        columns={fourTiles ? 4 : 2}
      />

      <Box
        className={insightsRow ? "flex-row items-start w-full" : "w-full"}
        style={insightsRow ? { gap: 24 } : undefined}
      >
        <Box className={insightsRow ? "flex-[7] min-w-0" : "w-full"}>
          <SpendingChart
            state={chartState}
            months={months}
            selectedMonth={selectedMonth}
            onSelectMonth={onSelectMonth}
            onRetry={onRetry}
            showDeltas={width > 360}
          />
        </Box>
        <Box
          className={
            insightsRow
              ? "flex-[5] min-w-0"
              : sideBySide
                ? "flex-row w-full mt-6"
                : "w-full mt-6"
          }
          style={insightsRow || sideBySide ? { gap: 24 } : { gap: 24 }}
        >
          <Box
            className={sideBySide ? "flex-1 min-w-0" : "w-full"}
            style={!insightsRow && !sideBySide ? { marginBottom: 24 } : undefined}
          >
            <MonthTrend
              state={chartState}
              months={months}
              selectedMonth={selectedMonth}
              onSelectMonth={onSelectMonth}
              onRetry={onRetry}
            />
          </Box>
          <Box className={sideBySide ? "flex-1 min-w-0" : "w-full"}>
            <TopMerchantsCard
              state={chartState}
              month={current}
              onRetry={onRetry}
            />
          </Box>
        </Box>
      </Box>
    </VStack>
  );
}

function AppLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 1000;
  const isCompact = width < 700;
  const chatWidth = Math.min(420, Math.max(340, Math.round(width * 0.3)));
  const keyboardBehavior =
    Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined;
  const keyboardVerticalOffset = Platform.OS === "ios" ? insets.top : 0;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(NO_REPORT);
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [months, setMonths] = useState<MonthSpend[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [chartState, setChartState] = useState<ChartState>(
    missingNativeApiUrl ? "empty" : "loading",
  );
  const reportRequestSeq = useRef(0);
  const chatScrollRef = useRef<ScrollView>(null);

  function applyMonths(next: MonthSpend[]) {
    setMonths(next);
    setSelectedMonth((current) => {
      if (current && next.some((month) => month.month === current)) return current;
      return next.length ? next[next.length - 1]!.month : null;
    });
  }

  function applyReportCheck(
    seq: number,
    check: ReportCheck,
    uploadBody?: unknown,
  ) {
    if (seq !== reportRequestSeq.current) return;
    if (check.failed) {
      setStatus(statusForFailedReportCheck(check.httpStatus, uploadBody));
      applyMonths([]);
      setChartState("error");
      return;
    }
    setStatus(formatReportStatus(check.body));
    const nextMonths = parseMonths(check.body);
    applyMonths(nextMonths);
    const loaded =
      !!check.body &&
      typeof check.body === "object" &&
      !Array.isArray(check.body) &&
      (check.body as Record<string, unknown>).loaded === true;
    setChartState(loaded ? "ready" : "empty");
  }

  async function refreshReport() {
    const seq = ++reportRequestSeq.current;
    setChartState("loading");
    applyReportCheck(seq, await readReportCheck());
  }

  useEffect(() => {
    if (missingNativeApiUrl) return;
    const seq = ++reportRequestSeq.current;
    let cancelled = false;
    readReportCheck().then((check) => {
      if (!cancelled) applyReportCheck(seq, check);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });
      if (result.canceled) return;

      setLoading(true);
      setChartState("loading");
      const fileAsset = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        if (fileAsset.file instanceof File) {
          formData.append("file", fileAsset.file, fileAsset.name);
        } else {
          const blobResponse = await fetch(fileAsset.uri);
          const fileBlob = await blobResponse.blob();
          formData.append("file", fileBlob, fileAsset.name);
        }
      } else {
        formData.append("file", {
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: "text/csv",
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Ingestion pipeline failed");
      }

      const uploadBody = await response.json().catch(() => undefined);
      const seq = ++reportRequestSeq.current;
      applyReportCheck(seq, await readReportCheck(), uploadBody);
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Could not upload report.");
      setChartState((current) =>
        current === "loading" ? (months.length ? "ready" : "empty") : current,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAskLLM = async () => {
    if (!query.trim()) return;

    const userQuery = query;
    setQuery("");
    setChatLog((prev) => [...prev, { role: "user", text: userQuery }]);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: userQuery }),
      });

      const data = await response.json();
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: data.answer || data.error },
      ]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: "Error connecting to local AI engine." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  function handleQuickAnswer(question: string, answer: string) {
    setChatLog((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "assistant", text: answer },
    ]);
  }

  const dashboard = (
    <Dashboard
      width={width}
      status={status}
      loading={loading}
      chartState={chartState}
      months={months}
      selectedMonth={selectedMonth}
      onSelectMonth={setSelectedMonth}
      onUpload={() => {
        void handleFileUpload();
      }}
      onRetry={() => {
        void refreshReport();
      }}
    />
  );

  const questions = (
    <QuickQuestions
      months={months}
      selectedMonth={selectedMonth}
      disabled={loading || chartState !== "ready"}
      horizontal={isCompact}
      onAnswer={handleQuickAnswer}
    />
  );

  const composer = (
    <Composer
      query={query}
      onChangeQuery={setQuery}
      onAsk={() => {
        void handleAskLLM();
      }}
      disabled={loading}
    />
  );

  if (missingNativeApiUrl) {
    return (
      <Box
        className="flex-1 bg-background-50 p-6"
        style={{ paddingTop: Math.max(24, insets.top) }}
      >
          <VStack space="md" className="max-w-[600px] mx-auto w-full">
            <Card className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm">
              <VStack space="xs">
                <Text className="text-xl font-bold text-typography-900">
                  API address required
                </Text>
                <Text className="text-sm text-typography-500 font-medium">
                  Set EXPO_PUBLIC_API_URL to the API origin, with no path and no
                  trailing slash, then rebuild the iOS or Android app.
                </Text>
              </VStack>
            </Card>
          </VStack>
      </Box>
    );
  }

  if (isWide) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-background-50"
        style={{ flex: 1 }}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <Box
          className="flex-1 flex-row min-h-0"
          style={{ paddingTop: insets.top }}
        >
          <ScrollView
            className="flex-1 min-h-0"
            contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}
          >
            {dashboard}
          </ScrollView>
          <Box
            style={{
              width: chatWidth,
              paddingTop: 24,
              paddingRight: 24,
              paddingBottom: Math.max(24, insets.bottom),
            }}
            className="min-h-0"
          >
            <Card className="flex-1 min-h-0 bg-white border border-outline-100 rounded-xl shadow-sm overflow-hidden">
              <VStack className="flex-1 min-h-0">
                <Box className="px-5 pt-4 pb-3 border-b border-outline-100">
                  <Text className="text-base font-bold text-typography-900">
                    Ask about your spending
                  </Text>
                  <Text className="text-sm text-typography-500 font-medium">
                    Answers use the loaded report
                  </Text>
                </Box>
                <ScrollView
                  ref={chatScrollRef}
                  className="flex-1 min-h-0"
                  contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                  accessibilityLabel="Chat messages"
                  onContentSizeChange={() => {
                    chatScrollRef.current?.scrollToEnd({ animated: true });
                  }}
                >
                  <ChatMessages messages={chatLog} loading={loading} />
                </ScrollView>
                <VStack space="sm" className="px-4 pt-3 pb-4 border-t border-outline-100">
                  {questions}
                  {composer}
                </VStack>
              </VStack>
            </Card>
          </Box>
        </Box>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background-50"
      style={{ flex: 1 }}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <Box className="flex-1 min-h-0" style={{ paddingTop: insets.top }}>
        <ScrollView
          ref={chatScrollRef}
          className="flex-1 min-h-0"
          contentContainerStyle={{
            padding: isCompact ? 16 : 24,
            gap: isCompact ? 16 : 24,
            paddingBottom: 16,
          }}
          onContentSizeChange={() => {
            if (chatLog.length > 0) {
              chatScrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          {dashboard}
          <Card className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm mt-6">
            <Text className="text-base font-bold text-typography-900 mb-1">
              Ask about your spending
            </Text>
            <Text className="text-sm text-typography-500 font-medium mb-3">
              Answers use the loaded report
            </Text>
            <ChatMessages messages={chatLog} loading={loading} />
          </Card>
        </ScrollView>
        <Box
          className="border-t border-outline-100 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(12, insets.bottom) }}
        >
          <VStack space="sm">
            {questions}
            {composer}
          </VStack>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider>
        <AppLayout />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
