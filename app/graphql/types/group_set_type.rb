# frozen_string_literal: true

#
# Copyright (C) 2018 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

module Types
  class GroupSetType < ApplicationObjectType
    graphql_name "GroupSet"

    alias_method :set, :object

    implements GraphQL::Types::Relay::Node
    implements Interfaces::LegacyIDInterface

    global_id_field :id

    field :name, String, null: true

    class SelfSignupPolicyType < BaseEnum
      graphql_name "SelfSignupPolicy"
      description <<~MD
        Determines if/how a student may join a group. A student can belong to
        only one group per group set at a time.
      MD

      value "enabled", "students may join any group", value: "enabled"
      value "restricted", "students may join a group in their section", value: "restricted"
      value "disabled", "self signup is not allowed"
    end

    field :member_limit, Integer, <<~MD, method: :group_limit, null: true
      Sets a cap on the number of members in the group.  Only applies when
      self-signup is enabled.
    MD

    field :self_signup, SelfSignupPolicyType, null: false
    def self_signup
      set.self_signup || "disabled"
    end

    class AutoLeaderPolicyType < BaseEnum
      graphql_name "AutoLeaderPolicy"
      description "Determines if/how a leader is chosen for each group"

      value "random", "a leader is chosen at random", value: "random"
      value "first", "the first student assigned to the group is the leader", value: "first"
    end

    field :auto_leader, AutoLeaderPolicyType, null: true

    field :groups_connection, GroupType.connection_type, null: true

    field :non_collaborative, Boolean, null: true

    def groups_connection
      Loaders::AssociationLoader.for(GroupCategory, :context).load(set).then do
        # this permission matches the REST api, but is probably too strict.
        # students are able to see groups in the canvas ui, so probably should
        # be able to see them here too
        if set.context.grants_any_right?(current_user, *RoleOverride::GRANULAR_MANAGE_GROUPS_PERMISSIONS)
          set.groups.active.by_name
        else
          nil
        end
      end
    end

    # this is a temporary fix for discussion, it should be efficiently paginated asap
    field :groups, [GroupType], null: true

    def groups
      Loaders::AssociationLoader.for(GroupCategory, :context).load(set).then do
        # this permission matches the REST api, but is probably too strict.
        # students are able to see groups in the canvas ui, so probably should
        # be able to see them here too
        if set.context.grants_any_right?(current_user, *RoleOverride::GRANULAR_MANAGE_GROUPS_PERMISSIONS)
          set.groups.active.by_name
        else
          nil
        end
      end
    end

    field :current_group, GroupType, null: true
    def current_group
      load_association(:groups).then do
        object.groups.active.find { |group| group.has_member?(current_user) }
      end
    end

    field :sis_id, String, null: true
    def sis_id
      load_association(:root_account).then do |root_account|
        set.sis_source_id if root_account.grants_any_right?(current_user, :read_sis, :manage_sis)
      end
    end
  end
end
