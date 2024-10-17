export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					operationName?: string;
					query?: string;
					variables?: Json;
					extensions?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			track_requests: {
				Row: {
					created_at: string;
					from_lat: number;
					from_lon: number;
					id: string;
					modified_at: string | null;
					name: string;
					status: Database["public"]["Enums"]["track_request_status"];
					to_lat: number;
					to_lon: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					from_lat: number;
					from_lon: number;
					id?: string;
					modified_at?: string | null;
					name: string;
					status?: Database["public"]["Enums"]["track_request_status"];
					to_lat: number;
					to_lon: number;
					user_id: string;
				};
				Update: {
					created_at?: string;
					from_lat?: number;
					from_lon?: number;
					id?: string;
					modified_at?: string | null;
					name?: string;
					status?: Database["public"]["Enums"]["track_request_status"];
					to_lat?: number;
					to_lon?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "track_requests_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			tracks: {
				Row: {
					created_at: string;
					id: string;
					name: string;
					track_request_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					name: string;
					track_request_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					name?: string;
					track_request_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "tracks_track_request_id_fkey";
						columns: ["track_request_id"];
						isOneToOne: false;
						referencedRelation: "track_requests";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "tracks_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			ksuid: {
				Args: Record<PropertyKey, never>;
				Returns: string;
			};
		};
		Enums: {
			track_request_status: "new" | "processing" | "done";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	PublicTableNameOrOptions extends
		| keyof (PublicSchema["Tables"] & PublicSchema["Views"])
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (
			& Database[PublicTableNameOrOptions["schema"]]["Tables"]
			& Database[PublicTableNameOrOptions["schema"]]["Views"]
		)
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database } ? (
		& Database[PublicTableNameOrOptions["schema"]]["Tables"]
		& Database[PublicTableNameOrOptions["schema"]]["Views"]
	)[TableName] extends {
		Row: infer R;
	} ? R
	: never
	: PublicTableNameOrOptions extends keyof (
		& PublicSchema["Tables"]
		& PublicSchema["Views"]
	) ? (
			& PublicSchema["Tables"]
			& PublicSchema["Views"]
		)[PublicTableNameOrOptions] extends {
			Row: infer R;
		} ? R
		: never
	: never;

export type TablesInsert<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
		Insert: infer I;
	} ? I
	: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
			Insert: infer I;
		} ? I
		: never
	: never;

export type TablesUpdate<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
		Update: infer U;
	} ? U
	: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
			Update: infer U;
		} ? U
		: never
	: never;

export type Enums<
	PublicEnumNameOrOptions extends
		| keyof PublicSchema["Enums"]
		| { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
		? PublicSchema["Enums"][PublicEnumNameOrOptions]
	: never;
