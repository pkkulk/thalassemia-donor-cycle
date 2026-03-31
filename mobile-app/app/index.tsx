import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";

export default function StartupGate() {
  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error || !data.session?.user) {
        router.replace("choose-role");
        return;
      }

      const userId = data.session.user.id;

      const { data: donorData } = await supabase
        .from("donor")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: patientData } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!isMounted) return;

      if (donorData) {
        router.replace("DonorDashboardScreen");
        return;
      }

      if (patientData) {
        router.replace("patient-home");
        return;
      }

      await supabase.auth.signOut();
      router.replace("choose-role");
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E76F51" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
  },
});
