import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLikes } from '@/components/LikesContext';

export default function LikedRecipes() {
	const { likes, unlike } = useLikes();

	if (!likes.length) {
		return (
			<View style={styles.empty}>
				<Text style={styles.emptyText}>You haven't liked any recipes yet.</Text>
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			{likes.map((r) => (
					<View key={String(r.id)} style={styles.card}>
						<View style={styles.info}>
							<Text style={styles.title}>Recipe {r.recipe_id}</Text>
							{r.created_at ? <Text style={styles.desc}>Liked {new Date(r.created_at).toLocaleString()}</Text> : null}
						</View>
						<TouchableOpacity style={styles.unlike} onPress={() => unlike(String(r.recipe_id))}>
							<Text style={styles.unlikeText}>Remove</Text>
						</TouchableOpacity>
					</View>
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 12 },
	empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
	emptyText: { color: '#666' },
	card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	info: { flex: 1, marginRight: 12 },
	title: { fontSize: 16, fontWeight: '600' },
	desc: { fontSize: 13, color: '#666' },
	unlike: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#ff4d4d', borderRadius: 6 },
	unlikeText: { color: '#fff', fontWeight: '600' },
});
