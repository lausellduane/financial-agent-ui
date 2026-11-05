import React, { useState } from "react";
import { ScrollView, Alert, Platform } from "react-native";
import { GluestackUIProvider } from "./components/ui/gluestack-ui-provider";
import { Box } from "./components/ui/box";
import { VStack } from "./components/ui/vstack";
import { HStack } from "./components/ui/hstack";
import { Text } from "./components/ui/text";
import { Input, InputField } from "./components/ui/input";
import { Button, ButtonText } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Spinner } from "./components/ui/spinner";
import * as DocumentPicker from "expo-document-picker";
import "./global.css";

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

export default function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("No report loaded");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([]);

  // Securely upload and parse statements locally on Windows
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });
      if (result.canceled) return;

      setLoading(true);
      const fileAsset = result.assets[0]; // Extract the first index item
      const formData = new FormData();

      if (Platform.OS === "web") {
        // METHOD A: If the native browser File object is nested under .file
        if (fileAsset.file instanceof File) {
          formData.append("file", fileAsset.file, fileAsset.name);
        } else {
          // METHOD B: Safe fallback - fetch the blob data directly from the browser memory URI
          const blobResponse = await fetch(fileAsset.uri);
          const fileBlob = await blobResponse.blob();
          formData.append("file", fileBlob, fileAsset.name);
        }
      } else {
        // Fallback for native mobile devices (iOS/Android)
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

      const data = await response.json();
      setStatus(`Loaded: ${data.count} records cached securely.`);
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Could not upload report.");
    } finally {
      setLoading(false);
    }
  };

  // Push localized queries down loopback port directly into local Llama model
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

  if (missingNativeApiUrl) {
    return (
      <GluestackUIProvider>
        <Box className="flex-1 bg-background-50 p-6 pt-12">
          <VStack space="md" className="max-w-[600px] mx-auto w-full">
            <Card
              variant="elevated"
              className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm"
            >
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
      </GluestackUIProvider>
    );
  }

  return (
    <GluestackUIProvider>
      <Box className="flex-1 bg-background-50 p-6 pt-12">
        <VStack space="md" className="max-w-[600px] mx-auto w-full flex-1">
          {/* Top Panel Brand Status Card */}
          <Card
            variant="elevated"
            className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm"
          >
            <VStack space="xs">
              <Text className="text-xl font-bold text-typography-900">
                Secure Cash Management AI
              </Text>
              <Text className="text-sm text-typography-500 font-medium">
                {status}
              </Text>
            </VStack>
          </Card>

          {/* Action Area Component Button */}
          <Button
            size="lg"
            variant="default"
            isDisabled={loading}
            onPress={handleFileUpload}
            className="rounded-xl h-12 bg-blue-500 hover:bg-primary-700 active:bg-primary-800 text-white"
          >
            <ButtonText className="font-semibold">
              {loading
                ? "Parsing Windows Filesystem..."
                : "Upload Transaction CSV"}
            </ButtonText>
          </Button>

          {/* Structured Chat History Logger */}
          <ScrollView className="flex-1 bg-white border border-outline-200 rounded-xl p-4 min-h-[300px]">
            <VStack space="sm" className="pb-4">
              {chatLog.length === 0 && (
                <Text className="text-center text-typography-400 my-12">
                  Upload a local statement file above to begin querying
                  securely.
                </Text>
              )}
              {chatLog.map((msg, index) => (
                <Box
                  key={index}
                  className={`p-3 rounded-xl max-w-[85%] bg-slate-100 ${
                    msg.role === "user"
                      ? "bg-blue-200 self-end"
                      : "bg-slate-100 self-start"
                  }`}
                >
                  <Text
                    className={
                      msg.role === "user"
                        ? "bg-primary-600"
                        : "text-typography-900"
                    }
                  >
                    {msg.text}
                  </Text>
                </Box>
              ))}
              {loading && <Spinner size="small" className="self-center my-4" />}
            </VStack>
          </ScrollView>

          {/* Input Communication Dashboard Container */}
          <HStack space="sm" className="items-center pb-4">
            <Input className="flex-1 rounded-xl bg-white h-12 border-outline-300 focus:border-primary-500">
              <InputField
                placeholder="Ask e.g., 'What was my highest charge?'"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleAskLLM}
              />
            </Input>
            <Button
              size="lg"
              variant="default"
              isDisabled={loading}
              onPress={handleAskLLM}
              className="rounded-xl h-12 bg-blue-500 hover:bg-primary-700 active:bg-primary-800 text-white"
            >
              <ButtonText className="font-semibold">Ask</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </Box>
    </GluestackUIProvider>
  );
}
