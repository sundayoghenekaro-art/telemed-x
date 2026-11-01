export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_chat_conversations: {
        Row: {
          created_at: string
          id: string
          patient_name: string | null
          patient_upid: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_name?: string | null
          patient_upid?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_name?: string | null
          patient_upid?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      allergy_override_audit_log: {
        Row: {
          action: string
          allergies: string[]
          created_at: string
          id: string
          medications: string[]
          patient_name: string
          pharmacist_name: string
          prescription_id: string
          severity: string
          timestamp: string
        }
        Insert: {
          action: string
          allergies: string[]
          created_at?: string
          id?: string
          medications: string[]
          patient_name: string
          pharmacist_name: string
          prescription_id: string
          severity: string
          timestamp?: string
        }
        Update: {
          action?: string
          allergies?: string[]
          created_at?: string
          id?: string
          medications?: string[]
          patient_name?: string
          pharmacist_name?: string
          prescription_id?: string
          severity?: string
          timestamp?: string
        }
        Relationships: []
      }
      anonymous_sessions: {
        Row: {
          alias: string
          alias_code: string
          created_at: string
          expires_at: string | null
          id: string
          real_user_id: string
          session_id: string | null
        }
        Insert: {
          alias: string
          alias_code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          real_user_id: string
          session_id?: string | null
        }
        Update: {
          alias?: string
          alias_code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          real_user_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemedicine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      care_visits: {
        Row: {
          caregiver_user_id: string
          created_at: string
          duration_minutes: number
          ended_at: string | null
          id: string
          notes: string | null
          patient_user_id: string
          scheduled_at: string
          started_at: string | null
          status: string
          visit_type: string
          vitals_recorded: Json | null
        }
        Insert: {
          caregiver_user_id: string
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_user_id: string
          scheduled_at: string
          started_at?: string | null
          status?: string
          visit_type?: string
          vitals_recorded?: Json | null
        }
        Update: {
          caregiver_user_id?: string
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_user_id?: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          visit_type?: string
          vitals_recorded?: Json | null
        }
        Relationships: []
      }
      caregiver_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_professional: boolean
          patient_user_id: string
          phone: string | null
          relationship: string
          specialty: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_professional?: boolean
          patient_user_id: string
          phone?: string | null
          relationship: string
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_professional?: boolean
          patient_user_id?: string
          phone?: string | null
          relationship?: string
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      caregiver_tasks: {
        Row: {
          caregiver_user_id: string
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          patient_user_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          caregiver_user_id: string
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_user_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          caregiver_user_id?: string
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_user_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "staff_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_audit_log: {
        Row: {
          action: string
          actor_id: string
          consent_request_id: string
          doctor_user_id: string
          id: string
          metadata: Json | null
          patient_user_id: string
          session_id: string
          timestamp: string
        }
        Insert: {
          action: string
          actor_id: string
          consent_request_id: string
          doctor_user_id: string
          id?: string
          metadata?: Json | null
          patient_user_id: string
          session_id: string
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string
          consent_request_id?: string
          doctor_user_id?: string
          id?: string
          metadata?: Json | null
          patient_user_id?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_audit_log_consent_request_id_fkey"
            columns: ["consent_request_id"]
            isOneToOne: false
            referencedRelation: "consent_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_requests: {
        Row: {
          created_at: string
          doctor_user_id: string
          expires_at: string | null
          id: string
          patient_user_id: string
          requested_at: string
          responded_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          doctor_user_id: string
          expires_at?: string | null
          id?: string
          patient_user_id: string
          requested_at?: string
          responded_at?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          doctor_user_id?: string
          expires_at?: string | null
          id?: string
          patient_user_id?: string
          requested_at?: string
          responded_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemedicine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_finding_notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body_part: string
          communicated_at: string
          communicated_to: string
          communication_method: string
          created_at: string
          finding: string
          id: string
          modality: string
          notes: string | null
          patient_name: string
          radiologist: string
          read_back_confirmed: boolean
          referring_physician: string
          report_id: string
          study_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body_part: string
          communicated_at: string
          communicated_to: string
          communication_method: string
          created_at?: string
          finding: string
          id?: string
          modality: string
          notes?: string | null
          patient_name: string
          radiologist: string
          read_back_confirmed?: boolean
          referring_physician: string
          report_id: string
          study_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body_part?: string
          communicated_at?: string
          communicated_to?: string
          communication_method?: string
          created_at?: string
          finding?: string
          id?: string
          modality?: string
          notes?: string | null
          patient_name?: string
          radiologist?: string
          read_back_confirmed?: boolean
          referring_physician?: string
          report_id?: string
          study_id?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number | null
          doctor_name: string
          doctor_type: string
          doctor_user_id: string
          end_time: string
          id: string
          is_available: boolean
          specific_date: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          doctor_name: string
          doctor_type: string
          doctor_user_id: string
          end_time: string
          id?: string
          is_available?: boolean
          specific_date?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          doctor_name?: string
          doctor_type?: string
          doctor_user_id?: string
          end_time?: string
          id?: string
          is_available?: boolean
          specific_date?: string | null
          start_time?: string
        }
        Relationships: []
      }
      external_doctors: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          institution: string | null
          license_number: string
          license_state: string
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: string
          updated_at: string
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          institution?: string | null
          license_number: string
          license_state: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty: string
          status?: string
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          institution?: string | null
          license_number?: string
          license_state?: string
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      hospital_admins: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_admins_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_doctors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          doctor_name: string
          doctor_user_id: string
          hospital_id: string
          id: string
          license_number: string | null
          specialty: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          doctor_name: string
          doctor_user_id: string
          hospital_id: string
          id?: string
          license_number?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          doctor_name?: string
          doctor_user_id?: string
          hospital_id?: string
          id?: string
          license_number?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          accepted_insurance: string[] | null
          accredited_specialties: string[] | null
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          slug: string
          state: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
          supported_languages: string[] | null
          zip_code: string | null
        }
        Insert: {
          accepted_insurance?: string[] | null
          accredited_specialties?: string[] | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          slug: string
          state?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          supported_languages?: string[] | null
          zip_code?: string | null
        }
        Update: {
          accepted_insurance?: string[] | null
          accredited_specialties?: string[] | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          slug?: string
          state?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          supported_languages?: string[] | null
          zip_code?: string | null
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          amount_approved: number | null
          amount_claimed: number
          claim_number: string
          created_at: string
          denial_reason: string | null
          diagnosis_codes: string[] | null
          id: string
          insurance_provider: string
          invoice_id: string | null
          notes: string | null
          patient_name: string
          policy_number: string
          procedure_codes: string[] | null
          resolved_at: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_claimed?: number
          claim_number: string
          created_at?: string
          denial_reason?: string | null
          diagnosis_codes?: string[] | null
          id?: string
          insurance_provider: string
          invoice_id?: string | null
          notes?: string | null
          patient_name: string
          policy_number: string
          procedure_codes?: string[] | null
          resolved_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_claimed?: number
          claim_number?: string
          created_at?: string
          denial_reason?: string | null
          diagnosis_codes?: string[] | null
          id?: string
          insurance_provider?: string
          invoice_id?: string | null
          notes?: string | null
          patient_name?: string
          policy_number?: string
          procedure_codes?: string[] | null
          resolved_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          created_at: string
          department: string | null
          discount: number
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          patient_id: string
          patient_name: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          created_at?: string
          department?: string | null
          discount?: number
          due_date?: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          patient_id: string
          patient_name: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          created_at?: string
          department?: string | null
          discount?: number
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          patient_id?: string
          patient_name?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      mood_assessments: {
        Row: {
          answers: Json
          assessment_type: string
          created_at: string
          id: string
          patient_user_id: string
          session_id: string | null
          severity: string | null
          total_score: number
        }
        Insert: {
          answers?: Json
          assessment_type: string
          created_at?: string
          id?: string
          patient_user_id: string
          session_id?: string | null
          severity?: string | null
          total_score?: number
        }
        Update: {
          answers?: Json
          assessment_type?: string
          created_at?: string
          id?: string
          patient_user_id?: string
          session_id?: string | null
          severity?: string | null
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "mood_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemedicine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_entries: {
        Row: {
          created_at: string
          id: string
          journal_notes: string | null
          logged_at: string
          mood_label: string
          mood_score: number
          patient_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journal_notes?: string | null
          logged_at?: string
          mood_label: string
          mood_score: number
          patient_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journal_notes?: string | null
          logged_at?: string
          mood_label?: string
          mood_score?: number
          patient_user_id?: string
        }
        Relationships: []
      }
      patient_accounts: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
          photo_url: string | null
          blood_type: string | null
          height_cm: number | null
          nationality: string | null
          occupation: string | null
          marital_status: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          photo_url?: string | null
          blood_type?: string | null
          height_cm?: number | null
          nationality?: string | null
          occupation?: string | null
          marital_status?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          photo_url?: string | null
          blood_type?: string | null
          height_cm?: number | null
          nationality?: string | null
          occupation?: string | null
          marital_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_calorie_goals: {
        Row: {
          created_at: string
          daily_calorie_goal: number
          id: string
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_calorie_goal?: number
          id?: string
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_calorie_goal?: number
          id?: string
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_exercises: {
        Row: {
          calories_burned: number
          created_at: string
          duration_minutes: number
          exercise_type: string
          id: string
          logged_at: string
          notes: string | null
          patient_user_id: string
          steps: number | null
        }
        Insert: {
          calories_burned?: number
          created_at?: string
          duration_minutes?: number
          exercise_type?: string
          id?: string
          logged_at?: string
          notes?: string | null
          patient_user_id: string
          steps?: number | null
        }
        Update: {
          calories_burned?: number
          created_at?: string
          duration_minutes?: number
          exercise_type?: string
          id?: string
          logged_at?: string
          notes?: string | null
          patient_user_id?: string
          steps?: number | null
        }
        Relationships: []
      }
      patient_meals: {
        Row: {
          calories: number
          created_at: string
          id: string
          logged_at: string
          meal_name: string
          meal_type: string
          notes: string | null
          patient_user_id: string
        }
        Insert: {
          calories?: number
          created_at?: string
          id?: string
          logged_at?: string
          meal_name: string
          meal_type?: string
          notes?: string | null
          patient_user_id: string
        }
        Update: {
          calories?: number
          created_at?: string
          id?: string
          logged_at?: string
          meal_name?: string
          meal_type?: string
          notes?: string | null
          patient_user_id?: string
        }
        Relationships: []
      }
      patient_medical_records: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          patient_user_id: string
          provider_name: string | null
          record_date: string | null
          record_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          patient_user_id: string
          provider_name?: string | null
          record_date?: string | null
          record_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          patient_user_id?: string
          provider_name?: string | null
          record_date?: string | null
          record_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_medications: {
        Row: {
          created_at: string
          dosage: string | null
          end_date: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          patient_user_id: string
          pharmacy: string | null
          prescribing_doctor: string | null
          refills_remaining: number | null
          route: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          patient_user_id: string
          pharmacy?: string | null
          prescribing_doctor?: string | null
          refills_remaining?: number | null
          route?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          patient_user_id?: string
          pharmacy?: string | null
          prescribing_doctor?: string | null
          refills_remaining?: number | null
          route?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          patient_user_id: string
          read: boolean
          referral_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          patient_user_id: string
          read?: boolean
          referral_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          patient_user_id?: string
          read?: boolean
          referral_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_notifications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_vitals: {
        Row: {
          blood_glucose: number | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          created_at: string
          heart_rate: number | null
          id: string
          patient_user_id: string
          recorded_at: string
          respiratory_rate: number | null
          sleep_hours: number | null
          source: string
          spo2: number | null
          steps: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          blood_glucose?: number | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          patient_user_id: string
          recorded_at?: string
          respiratory_rate?: number | null
          sleep_hours?: number | null
          source?: string
          spo2?: number | null
          steps?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          blood_glucose?: number | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string
          heart_rate?: number | null
          id?: string
          patient_user_id?: string
          recorded_at?: string
          respiratory_rate?: number | null
          sleep_hours?: number | null
          source?: string
          spo2?: number | null
          steps?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      patient_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          payment_date: string
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          payment_date?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      radiology_reports: {
        Row: {
          body_part: string
          comparison: string | null
          created_at: string
          critical: boolean
          findings: string
          id: string
          impression: string
          modality: string
          order_id: string
          patient_name: string
          patient_upid: string
          radiologist: string
          status: string
          study_id: string
          technique: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          body_part: string
          comparison?: string | null
          created_at?: string
          critical?: boolean
          findings: string
          id?: string
          impression: string
          modality: string
          order_id: string
          patient_name: string
          patient_upid: string
          radiologist: string
          status?: string
          study_id: string
          technique?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          body_part?: string
          comparison?: string | null
          created_at?: string
          critical?: boolean
          findings?: string
          id?: string
          impression?: string
          modality?: string
          order_id?: string
          patient_name?: string
          patient_upid?: string
          radiologist?: string
          status?: string
          study_id?: string
          technique?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      referral_results: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          referral_id: string
          released_at: string | null
          result_type: string
          status: string
          title: string
          uploaded_by: string
          validated_at: string | null
          validated_by: string | null
          vendor_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          referral_id: string
          released_at?: string | null
          result_type?: string
          status?: string
          title: string
          uploaded_by: string
          validated_at?: string | null
          validated_by?: string | null
          vendor_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          referral_id?: string
          released_at?: string | null
          result_type?: string
          status?: string
          title?: string
          uploaded_by?: string
          validated_at?: string | null
          validated_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_results_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_results_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          accepted_at: string | null
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          diagnosis_codes: string[] | null
          hospital_id: string | null
          id: string
          insurance_provider: string | null
          items: Json
          patient_chosen_at: string | null
          patient_name: string
          patient_upid: string
          patient_user_id: string | null
          policy_number: string | null
          priority: string
          referral_number: string
          referring_doctor: string
          referring_doctor_user_id: string
          status: string
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis_codes?: string[] | null
          hospital_id?: string | null
          id?: string
          insurance_provider?: string | null
          items?: Json
          patient_chosen_at?: string | null
          patient_name: string
          patient_upid: string
          patient_user_id?: string | null
          policy_number?: string | null
          priority?: string
          referral_number: string
          referring_doctor: string
          referring_doctor_user_id: string
          status?: string
          type: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis_codes?: string[] | null
          hospital_id?: string | null
          id?: string
          insurance_provider?: string | null
          items?: Json
          patient_chosen_at?: string | null
          patient_name?: string
          patient_upid?: string
          patient_user_id?: string | null
          policy_number?: string | null
          priority?: string
          referral_number?: string
          referring_doctor?: string
          referring_doctor_user_id?: string
          status?: string
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          sender_id: string
          sender_name: string
          sender_role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id: string
          sender_name: string
          sender_role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id?: string
          sender_name?: string
          sender_role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemedicine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_pain_maps: {
        Row: {
          body_view: string
          created_at: string
          draw_paths: Json
          id: string
          notes: string | null
          pain_points: Json
          patient_user_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          body_view?: string
          created_at?: string
          draw_paths?: Json
          id?: string
          notes?: string | null
          pain_points?: Json
          patient_user_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          body_view?: string
          created_at?: string
          draw_paths?: Json
          id?: string
          notes?: string | null
          pain_points?: Json
          patient_user_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_pain_maps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "telemedicine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_channels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          role_pair: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          role_pair?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          role_pair?: string | null
          type?: string
        }
        Relationships: []
      }
      staff_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "staff_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedicine_prescriptions: {
        Row: {
          created_at: string
          doctor_name: string
          doctor_user_id: string
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          medication_name: string
          patient_account_id: string | null
          patient_name: string
          refills: number | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          doctor_name: string
          doctor_user_id: string
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          medication_name: string
          patient_account_id?: string | null
          patient_name: string
          refills?: number | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          doctor_name?: string
          doctor_user_id?: string
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medication_name?: string
          patient_account_id?: string | null
          patient_name?: string
          refills?: number | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemedicine_prescriptions_patient_account_id_fkey"
            columns: ["patient_account_id"]
            isOneToOne: false
            referencedRelation: "patient_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_prescriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemedicine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedicine_sessions: {
        Row: {
          cancelled_by: string | null
          cancelled_reason: string | null
          chief_complaint: string | null
          created_at: string
          daily_room_name: string | null
          daily_room_url: string | null
          diagnosis: string | null
          doctor_name: string
          doctor_specialty: string | null
          doctor_type: string
          doctor_user_id: string
          duration_minutes: number
          ended_at: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_account_id: string | null
          patient_name: string
          patient_user_id: string | null
          scheduled_at: string
          session_code: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_by?: string | null
          cancelled_reason?: string | null
          chief_complaint?: string | null
          created_at?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          diagnosis?: string | null
          doctor_name: string
          doctor_specialty?: string | null
          doctor_type: string
          doctor_user_id: string
          duration_minutes?: number
          ended_at?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_account_id?: string | null
          patient_name: string
          patient_user_id?: string | null
          scheduled_at: string
          session_code: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_by?: string | null
          cancelled_reason?: string | null
          chief_complaint?: string | null
          created_at?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          diagnosis?: string | null
          doctor_name?: string
          doctor_specialty?: string | null
          doctor_type?: string
          doctor_user_id?: string
          duration_minutes?: number
          ended_at?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_account_id?: string | null
          patient_name?: string
          patient_user_id?: string | null
          scheduled_at?: string
          session_code?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemedicine_sessions_patient_account_id_fkey"
            columns: ["patient_account_id"]
            isOneToOne: false
            referencedRelation: "patient_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_admins: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_admins_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_staff: {
        Row: {
          created_at: string
          id: string
          license_number: string | null
          role: string | null
          staff_name: string
          status: string
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          license_number?: string | null
          role?: string | null
          staff_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          license_number?: string | null
          role?: string | null
          staff_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_staff_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          accepted_insurance: string[] | null
          address: string | null
          affiliated_hospital_id: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          phone: string | null
          services: string[] | null
          slug: string
          state: string | null
          status: string
          type: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          accepted_insurance?: string[] | null
          address?: string | null
          affiliated_hospital_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          services?: string[] | null
          slug: string
          state?: string | null
          status?: string
          type: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          accepted_insurance?: string[] | null
          address?: string | null
          affiliated_hospital_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          services?: string[] | null
          slug?: string
          state?: string | null
          status?: string
          type?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_affiliated_hospital_id_fkey"
            columns: ["affiliated_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          category: string
          created_at: string
          description: string | null
          id: string
          patient_user_id: string
          payment_method: string | null
          reference_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          patient_user_id: string
          payment_method?: string | null
          reference_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          patient_user_id?: string
          payment_method?: string | null
          reference_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "patient_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_accounts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          organization_name: string | null
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          organization_name?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          organization_name?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ambulance_location_requests: {
        Row: {
          accuracy_m: number | null
          ambulance_request_id: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          patient_user_id: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          accuracy_m?: number | null
          ambulance_request_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          patient_user_id?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          accuracy_m?: number | null
          ambulance_request_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          patient_user_id?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      ambulance_requests: {
        Row: {
          assigned_vehicle_id: string | null
          created_at: string
          destination_hospital_id: string | null
          destination_reason: string | null
          emergency_type: string
          id: string
          nature_description: string | null
          patient_count: number
          patient_user_id: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          requester_name: string
          requester_phone: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_vehicle_id?: string | null
          created_at?: string
          destination_hospital_id?: string | null
          destination_reason?: string | null
          emergency_type?: string
          id?: string
          nature_description?: string | null
          patient_count?: number
          patient_user_id?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          requester_name: string
          requester_phone: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_vehicle_id?: string | null
          created_at?: string
          destination_hospital_id?: string | null
          destination_reason?: string | null
          emergency_type?: string
          id?: string
          nature_description?: string | null
          patient_count?: number
          patient_user_id?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          requester_name?: string
          requester_phone?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ambulance_virtual_care_sessions: {
        Row: {
          channel: string
          clinician_name: string
          clinician_specialty: string | null
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          request_id: string
          started_at: string
          status: string
        }
        Insert: {
          channel?: string
          clinician_name: string
          clinician_specialty?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          request_id: string
          started_at?: string
          status?: string
        }
        Update: {
          channel?: string
          clinician_name?: string
          clinician_specialty?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      care_plan_tasks: {
        Row: {
          care_plan_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          patient_user_id: string
          status: string
          title: string
        }
        Insert: {
          care_plan_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_user_id: string
          status?: string
          title: string
        }
        Update: {
          care_plan_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_user_id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      care_plans: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis: string | null
          goals: string
          id: string
          interventions: string
          patient_user_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          goals: string
          id?: string
          interventions: string
          patient_user_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          goals?: string
          id?: string
          interventions?: string
          patient_user_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      defense_facilities: {
        Row: {
          branch: string
          command_level: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          parent_facility_id: string | null
          region: string | null
          status: string
          type: string
        }
        Insert: {
          branch?: string
          command_level?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          parent_facility_id?: string | null
          region?: string | null
          status?: string
          type: string
        }
        Update: {
          branch?: string
          command_level?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          parent_facility_id?: string | null
          region?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      defense_family_members: {
        Row: {
          allergies: string | null
          blood_type: string | null
          created_at: string
          created_by_staff_id: string | null
          date_of_birth: string | null
          full_name: string
          id: string
          notes: string | null
          personnel_id: string
          relationship: string
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          date_of_birth?: string | null
          full_name: string
          id?: string
          notes?: string | null
          personnel_id: string
          relationship?: string
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          date_of_birth?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          personnel_id?: string
          relationship?: string
        }
        Relationships: []
      }
      defense_field_consultations: {
        Row: {
          chief_complaint: string
          consultation_type: string
          created_at: string
          field_conditions: string | null
          field_location: string | null
          id: string
          personnel_id: string
          priority: string
          recommendations: string | null
          requesting_facility_id: string
          requesting_staff_id: string | null
          specialist_notes: string | null
          status: string
          supporting_facility_id: string | null
          supporting_staff_id: string | null
          updated_at: string
        }
        Insert: {
          chief_complaint: string
          consultation_type?: string
          created_at?: string
          field_conditions?: string | null
          field_location?: string | null
          id?: string
          personnel_id: string
          priority?: string
          recommendations?: string | null
          requesting_facility_id: string
          requesting_staff_id?: string | null
          specialist_notes?: string | null
          status?: string
          supporting_facility_id?: string | null
          supporting_staff_id?: string | null
          updated_at?: string
        }
        Update: {
          chief_complaint?: string
          consultation_type?: string
          created_at?: string
          field_conditions?: string | null
          field_location?: string | null
          id?: string
          personnel_id?: string
          priority?: string
          recommendations?: string | null
          requesting_facility_id?: string
          requesting_staff_id?: string | null
          specialist_notes?: string | null
          status?: string
          supporting_facility_id?: string | null
          supporting_staff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      defense_medical_records: {
        Row: {
          attending_staff_id: string | null
          classification: string
          created_at: string
          diagnosis: string | null
          facility_id: string | null
          field_location: string | null
          id: string
          is_field_record: boolean
          medications: string | null
          notes: string | null
          personnel_id: string
          record_date: string
          record_type: string
          treatment: string | null
        }
        Insert: {
          attending_staff_id?: string | null
          classification?: string
          created_at?: string
          diagnosis?: string | null
          facility_id?: string | null
          field_location?: string | null
          id?: string
          is_field_record?: boolean
          medications?: string | null
          notes?: string | null
          personnel_id: string
          record_date?: string
          record_type: string
          treatment?: string | null
        }
        Update: {
          attending_staff_id?: string | null
          classification?: string
          created_at?: string
          diagnosis?: string | null
          facility_id?: string | null
          field_location?: string | null
          id?: string
          is_field_record?: boolean
          medications?: string | null
          notes?: string | null
          personnel_id?: string
          record_date?: string
          record_type?: string
          treatment?: string | null
        }
        Relationships: []
      }
      defense_medical_staff: {
        Row: {
          created_at: string
          deployment_status: string
          facility_id: string
          full_name: string
          id: string
          rank: string | null
          role: string
          security_clearance: string
          specialty: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployment_status?: string
          facility_id: string
          full_name: string
          id?: string
          rank?: string | null
          role?: string
          security_clearance?: string
          specialty?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deployment_status?: string
          facility_id?: string
          full_name?: string
          id?: string
          rank?: string | null
          role?: string
          security_clearance?: string
          specialty?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      defense_personnel: {
        Row: {
          allergies: string | null
          blood_type: string | null
          branch: string
          created_at: string
          date_of_birth: string | null
          deployment_status: string
          facility_id: string | null
          full_name: string
          id: string
          notes: string | null
          rank: string | null
          security_clearance: string
          service_number: string
          unit: string | null
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          branch?: string
          created_at?: string
          date_of_birth?: string | null
          deployment_status?: string
          facility_id?: string | null
          full_name: string
          id?: string
          notes?: string | null
          rank?: string | null
          security_clearance?: string
          service_number: string
          unit?: string | null
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          branch?: string
          created_at?: string
          date_of_birth?: string | null
          deployment_status?: string
          facility_id?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          rank?: string | null
          security_clearance?: string
          service_number?: string
          unit?: string | null
        }
        Relationships: []
      }
      defense_super_admins: {
        Row: {
          created_at: string
          full_name: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      defense_triage_referrals: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          clinical_summary: string | null
          created_at: string
          from_facility_id: string
          id: string
          notes: string | null
          personnel_id: string
          reason: string
          referring_staff_id: string | null
          status: string
          to_facility_id: string
          transport_mode: string
          urgency: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          clinical_summary?: string | null
          created_at?: string
          from_facility_id: string
          id?: string
          notes?: string | null
          personnel_id: string
          reason: string
          referring_staff_id?: string | null
          status?: string
          to_facility_id: string
          transport_mode?: string
          urgency?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          clinical_summary?: string | null
          created_at?: string
          from_facility_id?: string
          id?: string
          notes?: string | null
          personnel_id?: string
          reason?: string
          referring_staff_id?: string | null
          status?: string
          to_facility_id?: string
          transport_mode?: string
          urgency?: string
        }
        Relationships: []
      }
      defense_user_accounts: {
        Row: {
          account_type: string
          created_at: string
          email: string
          family_member_id: string | null
          full_name: string
          id: string
          linked_personnel_id: string | null
          personnel_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          email: string
          family_member_id?: string | null
          full_name: string
          id?: string
          linked_personnel_id?: string | null
          personnel_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          email?: string
          family_member_id?: string | null
          full_name?: string
          id?: string
          linked_personnel_id?: string | null
          personnel_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      fhir_exports: {
        Row: {
          bundle_json: Json
          created_at: string
          id: string
          patient_user_id: string
          resource_types: Json
          version: string
        }
        Insert: {
          bundle_json?: Json
          created_at?: string
          id?: string
          patient_user_id: string
          resource_types?: Json
          version?: string
        }
        Update: {
          bundle_json?: Json
          created_at?: string
          id?: string
          patient_user_id?: string
          resource_types?: Json
          version?: string
        }
        Relationships: []
      }
      medication_dose_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string | null
          medication_name: string
          notes: string | null
          patient_user_id: string
          scheduled_time: string
          status: string
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id?: string | null
          medication_name: string
          notes?: string | null
          patient_user_id: string
          scheduled_time: string
          status?: string
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string | null
          medication_name?: string
          notes?: string | null
          patient_user_id?: string
          scheduled_time?: string
          status?: string
          taken_at?: string | null
        }
        Relationships: []
      }
      patient_allergies: {
        Row: {
          allergen: string
          created_at: string
          id: string
          noted_date: string | null
          notes: string | null
          patient_user_id: string
          reaction_type: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          allergen: string
          created_at?: string
          id?: string
          noted_date?: string | null
          notes?: string | null
          patient_user_id?: string
          reaction_type?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          allergen?: string
          created_at?: string
          id?: string
          noted_date?: string | null
          notes?: string | null
          patient_user_id?: string
          reaction_type?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_language_preferences: {
        Row: {
          id: string
          language: string
          patient_user_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          language?: string
          patient_user_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          language?: string
          patient_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_credentials: {
        Row: {
          created_at: string
          credential_name: string
          credential_type: string
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuing_authority: string | null
          license_number: string | null
          provider_user_id: string
          state: string | null
          status: string
          verified: boolean
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          credential_name: string
          credential_type: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          license_number?: string | null
          provider_user_id: string
          state?: string | null
          status?: string
          verified?: boolean
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          credential_name?: string
          credential_type?: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          license_number?: string | null
          provider_user_id?: string
          state?: string | null
          status?: string
          verified?: boolean
          verified_by?: string | null
        }
        Relationships: []
      }
      rpm_alert_thresholds: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          max_value: number | null
          metric: string
          min_value: number | null
          patient_user_id: string
          severity: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_value?: number | null
          metric: string
          min_value?: number | null
          patient_user_id: string
          severity?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_value?: number | null
          metric?: string
          min_value?: number | null
          patient_user_id?: string
          severity?: string
        }
        Relationships: []
      }
      rpm_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string | null
          metric: string
          patient_user_id: string
          severity: string
          status: string
          threshold_id: string | null
          value: number
          vital_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metric: string
          patient_user_id: string
          severity?: string
          status?: string
          threshold_id?: string | null
          value: number
          vital_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metric?: string
          patient_user_id?: string
          severity?: string
          status?: string
          threshold_id?: string | null
          value?: number
          vital_id?: string | null
        }
        Relationships: []
      }
      triage_assessments: {
        Row: {
          ai_summary: string | null
          created_at: string
          created_by_ai: boolean
          id: string
          patient_user_id: string
          recommendations: string | null
          recommended_specialty: string | null
          symptoms: string
          urgency_level: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          created_by_ai?: boolean
          id?: string
          patient_user_id: string
          recommendations?: string | null
          recommended_specialty?: string | null
          symptoms: string
          urgency_level?: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          created_by_ai?: boolean
          id?: string
          patient_user_id?: string
          recommendations?: string | null
          recommended_specialty?: string | null
          symptoms?: string
          urgency_level?: string
        }
        Relationships: []
      }
      ambulance_vehicles: {
        Row: {
          base_address: string | null
          base_latitude: number | null
          base_longitude: number | null
          created_at: string
          crew_names: string[] | null
          id: string
          plate_number: string
          status: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          base_address?: string | null
          base_latitude?: number | null
          base_longitude?: number | null
          created_at?: string
          crew_names?: string[] | null
          id?: string
          plate_number: string
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          base_address?: string | null
          base_latitude?: number | null
          base_longitude?: number | null
          created_at?: string
          crew_names?: string[] | null
          id?: string
          plate_number?: string
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      care_service_requests: {
        Row: {
          caregiver_profile_id: string | null
          created_at: string
          facility_id: string | null
          id: string
          notes: string | null
          patient_user_id: string
          preferred_date: string | null
          provider_type: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          caregiver_profile_id?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          patient_user_id?: string
          preferred_date?: string | null
          provider_type: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          caregiver_profile_id?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          patient_user_id?: string
          preferred_date?: string | null
          provider_type?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      defense_consultation_analytics: {
        Row: {
          branch: string | null
          chief_complaint: string
          consultation_id: string
          consultation_type: string
          created_at: string
          field_conditions: string | null
          field_location: string | null
          personnel_id: string | null
          personnel_name: string | null
          personnel_rank: string | null
          priority: string
          recommendations: string | null
          requesting_facility_id: string | null
          requesting_facility_name: string | null
          requesting_facility_region: string | null
          requesting_facility_type: string | null
          requesting_physician_name: string | null
          requesting_physician_rank: string | null
          requesting_physician_role: string | null
          requesting_physician_specialty: string | null
          requesting_staff_id: string | null
          service_number: string | null
          specialist_notes: string | null
          status: string
          supporting_facility_id: string | null
          supporting_facility_name: string | null
          supporting_facility_region: string | null
          supporting_facility_type: string | null
          supporting_physician_name: string | null
          supporting_physician_rank: string | null
          supporting_physician_role: string | null
          supporting_physician_specialty: string | null
          supporting_staff_id: string | null
          unit: string | null
          updated_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_hospital_admin: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_admin: {
        Args: { _user_id: string; _vendor_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "physician"
        | "nurse"
        | "pharmacist"
        | "lab_technician"
        | "radiologist"
        | "receptionist"
        | "billing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "physician",
        "nurse",
        "pharmacist",
        "lab_technician",
        "radiologist",
        "receptionist",
        "billing",
      ],
    },
  },
} as const
